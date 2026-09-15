export type SetupStep = {
  n: number;
  kind: string;
  title: string;
  inPlainEnglish: string;
  example: string;
  countKey: keyof SetupCounts;
};

export type SetupCounts = {
  campuses: number;
  faculties: number;
  departments: number;
  programmes: number;
  courses: number;
  terms: number;
  offerings: number;
  students: number;
  lecturers: number;
  enrolments: number;
  offeringLecturers: number;
  lecturersReady: number;
};

export const SETUP_STEPS: SetupStep[] = [
  {
    n: 1,
    kind: "campuses",
    title: "Campuses",
    inPlainEnglish:
      "The three university sites: Bonaberi, Bonamoussadi and Ndogpassi. Students and lecturers choose one of these when they register.",
    example:
      "code,name,timezone\nBONABERI,Bonaberi,Africa/Douala\nBONAMOUSSADI,Bonamoussadi,Africa/Douala\nNDOGPASSI,Ndogpassi,Africa/Douala",
    countKey: "campuses",
  },
  {
    n: 2,
    kind: "faculties",
    title: "Faculties",
    inPlainEnglish: "The faculties, e.g. Faculty of Engineering.",
    example: "code,name\nENG,Faculty of Engineering",
    countKey: "faculties",
  },
  {
    n: 3,
    kind: "departments",
    title: "Departments",
    inPlainEnglish: "Departments inside a faculty. facultyCode must match step 2.",
    example: "code,name,facultyCode\nSWE,Software Engineering,ENG",
    countKey: "departments",
  },
  {
    n: 4,
    kind: "programmes",
    title: "Programmes",
    inPlainEnglish: "What students study, e.g. HND Software Engineering.",
    example: "code,name,facultyCode,departmentCode\nHNDSWE,HND Software Engineering,ENG,SWE",
    countKey: "programmes",
  },
  {
    n: 5,
    kind: "courses",
    title: "Courses",
    inPlainEnglish: "Catalogue courses such as ENG101 Academic Writing.",
    example: "code,title\nENG101,Academic Writing",
    countKey: "courses",
  },
  {
    n: 6,
    kind: "terms",
    title: "Academic terms",
    inPlainEnglish: "The semester or year, e.g. 2026/27 Semester 1.",
    example: "code,name\n2026S1,2026/27 Semester 1",
    countKey: "terms",
  },
  {
    n: 7,
    kind: "offerings",
    title: "Class offerings",
    inPlainEnglish:
      "A real class: this course, this term, this campus, this programme, this level. campusCode must be BONABERI, BONAMOUSSADI or NDOGPASSI.",
    example:
      "offeringKey,courseCode,termCode,campusCode,programmeCode,level,group\nENG101-2026S1-BONAMOUSSADI-SWE-200,ENG101,2026S1,BONAMOUSSADI,HNDSWE,HND 2,",
    countKey: "offerings",
  },
  {
    n: 8,
    kind: "enrolments",
    title: "Student enrolments",
    inPlainEnglish:
      "Which registered student is in which class (offeringKey + matricule). The student must already have registered in ScriptGrade.",
    example:
      "matricule,offeringKey,active\nSWE/24/0016,ENG101-2026S1-BONAMOUSSADI-SWE-200,true",
    countKey: "enrolments",
  },
  {
    n: 9,
    kind: "offering-lecturers",
    title: "Who teaches which class",
    inPlainEnglish:
      "Links a registered lecturer email to an offering so they can create exercises there.",
    example:
      "email,offeringKey\njohn.doe@university.edu,ENG101-2026S1-BONAMOUSSADI-SWE-200",
    countKey: "offeringLecturers",
  },
];

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
