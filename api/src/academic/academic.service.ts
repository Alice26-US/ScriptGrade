import { BadRequestException, ForbiddenException, Injectable, OnModuleInit } from "@nestjs/common";
import { deriveExerciseStatus, ExerciseStatus, UNIVERSITY_CAMPUSES } from "@scriptgrade/domain";
import { Actor } from "../common/types/actor";
import { PrismaService } from "../prisma/prisma.service";
import { UNIVERSITY_FACULTIES } from "./catalog";

const offeringInclude = {
  course: true,
  campus: true,
  programme: true,
  term: true,
} as const;

@Injectable()
export class AcademicService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.ensureCampuses();
    await this.ensureFaculties();
  }

  async ensureCampuses(): Promise<void> {
    for (const campus of UNIVERSITY_CAMPUSES) {
      await this.prisma.campus.upsert({
        where: { code: campus.code },
        create: {
          code: campus.code,
          name: campus.name,
          timezone: "Africa/Douala",
        },
        update: { name: campus.name },
      });
    }
  }

  async ensureFaculties(): Promise<void> {
    for (const faculty of UNIVERSITY_FACULTIES) {
      const row = await this.prisma.faculty.upsert({
        where: { code: faculty.code },
        create: { code: faculty.code, name: faculty.name },
        update: { name: faculty.name },
      });
      for (const dept of faculty.departments) {
        await this.prisma.department.upsert({
          where: { code: dept.code },
          create: {
            code: dept.code,
            name: dept.name,
            facultyId: row.id,
          },
          update: { name: dept.name, facultyId: row.id },
        });
      }
    }
  }

  listFaculties() {
    return this.prisma.faculty.findMany({
      where: { code: { in: ["HMS", "ENG", "AGR"] } },
      include: { departments: { orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    });
  }

  listCampuses() {
    const codes = UNIVERSITY_CAMPUSES.map((c) => c.code);
    return this.prisma.campus.findMany({
      where: { code: { in: [...codes] } },
      orderBy: { name: "asc" },
    });
  }

  offeringTimezone(offering: {
    timezone: string | null;
    campus: { timezone: string };
  }): string {
    return offering.timezone || offering.campus.timezone || "UTC";
  }

  async listOfferingsFor(actor: Actor) {
    if (actor.role === "ADMIN") {
      const rows = await this.prisma.courseOffering.findMany({
        where: { active: true },
        include: offeringInclude,
        orderBy: { offeringKey: "asc" },
      });
      return rows.map(presentOffering);
    }
    if (actor.role === "LECTURER" && actor.lecturerId) {
      const rows = await this.prisma.courseOffering.findMany({
        where: await this.lecturerOfferingWhere(actor.lecturerId),
        include: offeringInclude,
        orderBy: { offeringKey: "asc" },
      });
      return rows.map(presentOffering);
    }
    if (actor.role === "STUDENT" && actor.studentId) {
      const rows = await this.prisma.courseOffering.findMany({
        where: await this.studentOfferingWhere(actor.studentId),
        include: offeringInclude,
        orderBy: { offeringKey: "asc" },
      });
      return rows.map(presentOffering);
    }
    return [];
  }

  async assertLecturerCanUseOffering(lecturerId: string, offeringId: string): Promise<void> {
    const row = await this.prisma.courseOffering.findFirst({
      where: {
        id: offeringId,
        ...(await this.lecturerOfferingWhere(lecturerId)),
      },
    });
    if (!row) {
      throw new ForbiddenException("You are not authorized to use this class offering");
    }
  }

  private async lecturerOfferingWhere(lecturerId: string) {
    const lecturer = await this.prisma.lecturer.findUnique({ where: { id: lecturerId } });
    const or: Array<Record<string, unknown>> = [
      { lecturers: { some: { lecturerId } } },
    ];
    if (lecturer?.campusId && lecturer.facultyId) {
      or.push({
        campusId: lecturer.campusId,
        programme: { facultyId: lecturer.facultyId },
      });
    }
    return { active: true, OR: or };
  }

  async academicCatalog() {
    const [courses, terms, campuses, programmes, offerings, lecturers] = await Promise.all([
      this.prisma.course.findMany({ orderBy: { code: "asc" } }),
      this.prisma.academicTerm.findMany({ orderBy: { code: "asc" } }),
      this.prisma.campus.findMany({ orderBy: { name: "asc" } }),
      this.prisma.programme.findMany({ orderBy: { name: "asc" } }),
      this.prisma.courseOffering.findMany({
        include: offeringInclude,
        orderBy: { offeringKey: "asc" },
      }),
      this.prisma.lecturer.findMany({
        where: { active: true },
        orderBy: { email: "asc" },
        select: { id: true, email: true, firstName: true, lastName: true },
      }),
    ]);
    return {
      courses,
      terms,
      campuses,
      programmes,
      lecturers,
      offerings: offerings.map(presentOffering),
    };
  }

  async createCourse(codeRaw: string, title: string) {
    const code = codeRaw.trim().toUpperCase();
    if (!code || !title.trim()) throw new BadRequestException("Course code and title are required");
    return this.prisma.course.upsert({
      where: { code },
      create: { code, title: title.trim() },
      update: { title: title.trim() },
    });
  }

  async createTerm(codeRaw: string, name: string) {
    const code = codeRaw.trim().toUpperCase();
    if (!code || !name.trim()) throw new BadRequestException("Term code and name are required");
    return this.prisma.academicTerm.upsert({
      where: { code },
      create: { code, name: name.trim() },
      update: { name: name.trim() },
    });
  }

  async createOffering(args: {
    courseId: string;
    termId: string;
    campusId: string;
    programmeId: string;
    level: string;
    group?: string;
  }) {
    const level = args.level.trim();
    if (!level) throw new BadRequestException("Level is required");
    const [course, term, campus, programme] = await Promise.all([
      this.prisma.course.findUnique({ where: { id: args.courseId } }),
      this.prisma.academicTerm.findUnique({ where: { id: args.termId } }),
      this.prisma.campus.findUnique({ where: { id: args.campusId } }),
      this.prisma.programme.findUnique({ where: { id: args.programmeId } }),
    ]);
    if (!course) throw new BadRequestException("Unknown course");
    if (!term) throw new BadRequestException("Unknown academic term");
    if (!campus) throw new BadRequestException("Unknown campus");
    if (!programme) throw new BadRequestException("Unknown programme");
    const group = args.group?.trim() || null;
    const offeringKey = [course.code, term.code, campus.code, programme.code, level.replace(/\s+/g, ""), group]
      .filter(Boolean)
      .join("-");
    const row = await this.prisma.courseOffering.upsert({
      where: { offeringKey },
      create: {
        offeringKey,
        courseId: course.id,
        termId: term.id,
        campusId: campus.id,
        programmeId: programme.id,
        level,
        group,
        active: true,
      },
      update: { level, group, active: true },
      include: offeringInclude,
    });
    return presentOffering(row);
  }

  async studentOfferingWhere(studentId: string) {
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    const or: Array<Record<string, unknown>> = [
      { enrolments: { some: { studentId, active: true } } },
    ];
    if (student?.campusId && student.programmeId && student.level) {
      or.push({
        campusId: student.campusId,
        programmeId: student.programmeId,
        level: student.level.trim(),
      });
    }
    return { active: true, OR: or };
  }

  async ensureStudentEnrolment(studentId: string, offeringId: string): Promise<void> {
    const existing = await this.prisma.enrolment.findUnique({
      where: { studentId_offeringId: { studentId, offeringId } },
    });
    if (existing?.active) return;
    const allowed = await this.prisma.courseOffering.findFirst({
      where: { id: offeringId, ...(await this.studentOfferingWhere(studentId)) },
    });
    if (!allowed) {
      throw new ForbiddenException("You are not in this class");
    }
    await this.prisma.enrolment.upsert({
      where: { studentId_offeringId: { studentId, offeringId } },
      create: { studentId, offeringId, active: true },
      update: { active: true },
    });
  }

  async enrolStudentByMatricule(offeringId: string, matriculeRaw: string) {
    const offering = await this.prisma.courseOffering.findUnique({ where: { id: offeringId } });
    if (!offering) throw new BadRequestException("Unknown class offering");
    const matricule = matriculeRaw.trim().toUpperCase().replace(/\s+/g, "");
    const student = await this.prisma.student.findUnique({ where: { matricule } });
    if (!student || !student.active) {
      throw new BadRequestException("No registered student with that matricule");
    }
    await this.prisma.enrolment.upsert({
      where: { studentId_offeringId: { studentId: student.id, offeringId } },
      create: { studentId: student.id, offeringId, active: true },
      update: { active: true },
    });
    return {
      ok: true,
      matricule: student.matricule,
      fullName: `${student.firstName} ${student.lastName}`.trim(),
    };
  }

  async enrolMatchingStudents(offeringId: string): Promise<number> {
    const offering = await this.prisma.courseOffering.findUnique({ where: { id: offeringId } });
    if (!offering) return 0;
    const students = await this.prisma.student.findMany({
      where: {
        active: true,
        campusId: offering.campusId,
        programmeId: offering.programmeId,
      },
    });
    const want = normalizeLevel(offering.level);
    let count = 0;
    for (const student of students) {
      if (normalizeLevel(student.level) !== want) continue;
      await this.prisma.enrolment.upsert({
        where: { studentId_offeringId: { studentId: student.id, offeringId } },
        create: { studentId: student.id, offeringId, active: true },
        update: { active: true },
      });
      count += 1;
    }
    return count;
  }

  async assignLecturerToOffering(offeringId: string, lecturerId: string) {
    const [offering, lecturer] = await Promise.all([
      this.prisma.courseOffering.findUnique({ where: { id: offeringId } }),
      this.prisma.lecturer.findUnique({ where: { id: lecturerId } }),
    ]);
    if (!offering) throw new BadRequestException("Unknown offering");
    if (!lecturer) throw new BadRequestException("Unknown lecturer");
    await this.prisma.offeringLecturer.upsert({
      where: { offeringId_lecturerId: { offeringId, lecturerId } },
      create: { offeringId, lecturerId },
      update: {},
    });
    return { ok: true };
  }

  liveExerciseStatus(exercise: {
    status: ExerciseStatus;
    opensAt: Date;
    closesAt: Date;
  }): ExerciseStatus {
    return deriveExerciseStatus({
      stored: exercise.status,
      opensAt: exercise.opensAt,
      closesAt: exercise.closesAt,
      now: new Date(),
    });
  }
}

function presentOffering(row: {
  id: string;
  offeringKey: string;
  level: string;
  group: string | null;
  course: { code: string; title: string };
  campus: { name: string };
  programme: { name: string };
  term: { name: string };
}) {
  const parts = [
    row.course.code,
    row.course.title,
    row.campus.name,
    row.programme.name,
    row.level,
    row.term.name,
  ];
  if (row.group) parts.push(row.group);
  return {
    id: row.id,
    offeringKey: row.offeringKey,
    level: row.level,
    group: row.group,
    course: row.course,
    campus: row.campus,
    programme: row.programme,
    term: row.term,
    label: parts.join(" — "),
  };
}

function normalizeLevel(value: string | null | undefined): string {
  return (value ?? "").trim().toUpperCase().replace(/\s+/g, " ");
}
