ALTER TABLE "Student" ADD COLUMN "onboardingCompletedAt" TIMESTAMPTZ;
ALTER TABLE "Lecturer" ADD COLUMN "onboardingCompletedAt" TIMESTAMPTZ;
ALTER TABLE "ActivationOtp" ADD COLUMN "targetEmail" TEXT;
