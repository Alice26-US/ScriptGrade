import { Controller, Get } from "@nestjs/common";
import { AcademicService } from "./academic.service";

@Controller("catalog")
export class CatalogController {
  constructor(private readonly academic: AcademicService) {}

  @Get("faculties")
  faculties() {
    return this.academic.listFaculties();
  }

  @Get("campuses")
  campuses() {
    return this.academic.listCampuses();
  }
}
