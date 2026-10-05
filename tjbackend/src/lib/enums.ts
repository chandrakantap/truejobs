import { z } from "zod";
import {
  AtsType,
  CrawlRunStatus,
  EmploymentType,
  JobCategory,
  JobEventType,
  JobStatus,
  Region,
  SalaryPeriod,
  Seniority,
  WorkplaceType,
} from "../generated/prisma/enums.js";

export {
  AtsType,
  CrawlRunStatus,
  EmploymentType,
  JobCategory,
  JobEventType,
  JobStatus,
  Region,
  SalaryPeriod,
  Seniority,
  WorkplaceType,
};

/** Zod enum schemas built from the Prisma enums, for reuse in route schemas. */
export const JobStatusSchema = z.enum(JobStatus);
export const WorkplaceTypeSchema = z.enum(WorkplaceType);
export const EmploymentTypeSchema = z.enum(EmploymentType);
export const SenioritySchema = z.enum(Seniority);
export const JobCategorySchema = z.enum(JobCategory);
export const RegionSchema = z.enum(Region);
export const SalaryPeriodSchema = z.enum(SalaryPeriod);
export const JobEventTypeSchema = z.enum(JobEventType);
export const AtsTypeSchema = z.enum(AtsType);
export const CrawlRunStatusSchema = z.enum(CrawlRunStatus);
