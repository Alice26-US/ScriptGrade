import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { ProcessingService } from "./processing.service";
import {
  QUEUE_CLOSE_EXERCISES,
  QUEUE_EXPIRE_RESERVATION,
  QUEUE_PROCESS_VERSION,
  QUEUE_SIMILARITY,
} from "./queues";

@Processor(QUEUE_PROCESS_VERSION)
export class ProcessVersionProcessor extends WorkerHost {
  private readonly log = new Logger(ProcessVersionProcessor.name);
  constructor(private readonly processing: ProcessingService) {
    super();
  }

  async process(job: Job<{ versionId: string }>): Promise<void> {
    await this.processing.processVersion(job.data.versionId);
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job, err: Error) {
    this.log.error(`process-version ${job?.id} failed: ${err.message}`);
  }
}

@Processor(QUEUE_SIMILARITY)
export class SimilarityProcessor extends WorkerHost {
  constructor(private readonly processing: ProcessingService) {
    super();
  }
  async process(job: Job<{ exerciseId: string }>): Promise<void> {
    await this.processing.runSimilarity(job.data.exerciseId);
  }
}

@Processor(QUEUE_EXPIRE_RESERVATION)
export class ExpireReservationProcessor extends WorkerHost {
  constructor(private readonly processing: ProcessingService) {
    super();
  }
  async process(job: Job<{ reservationId: string }>): Promise<void> {
    await this.processing.expireReservation(job.data.reservationId);
  }
}

@Processor(QUEUE_CLOSE_EXERCISES)
export class CloseExercisesProcessor extends WorkerHost {
  constructor(private readonly processing: ProcessingService) {
    super();
  }
  async process(): Promise<void> {
    await this.processing.closeDueExercises();
  }
}
