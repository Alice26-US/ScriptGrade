CREATE TABLE "AcademicLevel" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "AcademicLevel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AcademicLevel_code_key" ON "AcademicLevel"("code");
CREATE UNIQUE INDEX "AcademicLevel_name_key" ON "AcademicLevel"("name");
