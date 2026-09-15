export const UNIVERSITY_FACULTIES = [
  {
    code: "HMS",
    name: "Health and Medical Sciences",
    departments: [
      { code: "MED", name: "Medicine" },
      { code: "NUR", name: "Nursing" },
      { code: "PHA", name: "Pharmacy" },
      { code: "PH", name: "Public Health" },
      { code: "MLS", name: "Medical Laboratory Sciences" },
      { code: "MID", name: "Midwifery" },
    ],
  },
  {
    code: "ENG",
    name: "Engineering",
    departments: [
      { code: "SWE", name: "Software Engineering" },
      { code: "CVE", name: "Civil Engineering" },
      { code: "EEE", name: "Electrical Engineering" },
      { code: "MEE", name: "Mechanical Engineering" },
      { code: "CEN", name: "Computer Engineering" },
    ],
  },
  {
    code: "AGR",
    name: "Agriculture",
    departments: [
      { code: "AGN", name: "Agronomy" },
      { code: "ANS", name: "Animal Science" },
      { code: "AEC", name: "Agricultural Economics" },
      { code: "CRS", name: "Crop Science" },
      { code: "SOS", name: "Soil Science" },
    ],
  },
] as const;
