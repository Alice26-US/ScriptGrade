import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Actor } from "../types/actor";

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Actor => {
    const req = ctx.switchToHttp().getRequest<{ user: Actor }>();
    return req.user;
  },
);
