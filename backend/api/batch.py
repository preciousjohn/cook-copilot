"""
Batch run endpoint for research evaluation.

POST /api/batch/run  — start a batch job (runs chef N times with current settings)
GET  /api/batch/{run_id} — poll for status + results
GET  /api/batch         — list all batch runs (most recent first)
"""
from __future__ import annotations

import time
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

from schemas.profiles import UserProfileCreate

router = APIRouter()

# In-memory store: run_id → BatchJob
_batch_jobs: Dict[str, "BatchJob"] = {}


# ── Schemas ───────────────────────────────────────────────────────────────────

class BatchInput(BaseModel):
    prompt: str
    profile: UserProfileCreate


class BatchRunRequest(BaseModel):
    n: int = 10
    stage: str = "chef"          # "dietitian" | "chef"
    inputs: List[BatchInput]     # if len < n, repeat cyclically


class BatchRunResult(BaseModel):
    index: int
    prompt: str
    output: Dict[str, Any]
    duration_ms: float
    error: Optional[str] = None


class BatchJob(BaseModel):
    run_id: str
    stage: str
    n: int
    status: str = "running"      # "running" | "done" | "error"
    completed: int = 0
    results: List[BatchRunResult] = []
    started_at: float = 0.0
    finished_at: Optional[float] = None
    error: Optional[str] = None


# ── Background task ───────────────────────────────────────────────────────────

def _run_batch(job: BatchJob, inputs: List[BatchInput]) -> None:
    """Run the batch job in background, updating job in-place."""
    from db.repositories.settings import get_settings_record
    import services.dietitian as dietitian_service
    import services.chef as chef_service
    from prompt_parser import parse as parse_prompt

    settings = get_settings_record()
    model = settings.llm_model
    use_rag = settings.use_rag
    skip_dietitian = settings.skip_dietitian

    # Default nutrition targets used when dietitian is skipped
    _EMPTY_NUTRITION: Dict[str, Any] = {
        "kcal": {"min": 0, "max": 9999},
        "sugar_g": {"min": 0, "max": 9999},
        "composition": {},
    }

    try:
        for i in range(job.n):
            inp = inputs[i % len(inputs)]
            t0 = time.time()
            error_msg: Optional[str] = None
            output: Dict[str, Any] = {}

            try:
                # Step 1: Parse prompt
                parsed = parse_prompt(inp.prompt, model=model)

                if job.stage == "dietitian":
                    result = dietitian_service.run(
                        profile=inp.profile,
                        meal_type=parsed.meal_type,
                        use_rag=use_rag,
                        model=model,
                    )
                    output = result

                elif job.stage == "chef":
                    # Step 2: Dietitian (or skip)
                    if skip_dietitian:
                        nutrition_targets = _EMPTY_NUTRITION
                        allergens: List[str] = []
                    else:
                        diet_result = dietitian_service.run(
                            profile=inp.profile,
                            meal_type=parsed.meal_type,
                            use_rag=use_rag,
                            model=model,
                        )
                        nutrition_targets = diet_result.get("nutrition_targets", _EMPTY_NUTRITION)
                        allergens = diet_result.get("allergens", [])

                    # Step 3: Chef
                    profile = inp.profile
                    output = chef_service.run(
                        nutrition_targets=nutrition_targets,
                        allergens=allergens,
                        age=profile.age,
                        sex=profile.sex,
                        dietary_preferences=profile.dietaryPreferences,
                        medical_conditions=profile.medicalConditions,
                        use_rag=use_rag,
                        model=model,
                        shape=parsed.shape,
                        meal_type=parsed.meal_type,
                        requested_ingredients=parsed.ingredients,
                        requested_menu=parsed.menu,
                    )

            except Exception as e:
                error_msg = str(e)

            duration_ms = (time.time() - t0) * 1000
            job.results.append(BatchRunResult(
                index=i,
                prompt=inp.prompt,
                output=output,
                duration_ms=round(duration_ms, 1),
                error=error_msg,
            ))
            job.completed = i + 1
            print(f"[Batch] {job.run_id} — {i + 1}/{job.n} done ({duration_ms:.0f}ms)")

        job.status = "done"
    except Exception as e:
        job.status = "error"
        job.error = str(e)
    finally:
        job.finished_at = time.time()


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/api/batch/run")
async def start_batch_run(
    req: BatchRunRequest,
    background_tasks: BackgroundTasks,
) -> Dict[str, Any]:
    if req.n < 1 or req.n > 100:
        raise HTTPException(status_code=400, detail="n must be between 1 and 100")
    if not req.inputs:
        raise HTTPException(status_code=400, detail="inputs must not be empty")
    if req.stage not in ("dietitian", "chef"):
        raise HTTPException(status_code=400, detail="stage must be 'dietitian' or 'chef'")

    run_id = str(uuid.uuid4())[:8]
    job = BatchJob(run_id=run_id, stage=req.stage, n=req.n, started_at=time.time())
    _batch_jobs[run_id] = job

    background_tasks.add_task(_run_batch, job, req.inputs)
    return {"run_id": run_id, "n": req.n, "stage": req.stage, "status": "running"}


@router.get("/api/batch/{run_id}")
async def get_batch_run(run_id: str) -> BatchJob:
    job = _batch_jobs.get(run_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Batch run '{run_id}' not found")
    return job


@router.get("/api/batch")
async def list_batch_runs() -> List[Dict[str, Any]]:
    """Return summary list of all batch runs, most recent first."""
    jobs = sorted(_batch_jobs.values(), key=lambda j: j.started_at, reverse=True)
    return [
        {
            "run_id": j.run_id,
            "stage": j.stage,
            "n": j.n,
            "completed": j.completed,
            "status": j.status,
            "started_at": j.started_at,
            "finished_at": j.finished_at,
        }
        for j in jobs
    ]
