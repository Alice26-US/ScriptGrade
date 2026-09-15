import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { Request } from "express";
import { AppConfig } from "../config/configuration";
import { Actor } from "../common/types/actor";
import { PrismaService } from "../prisma/prisma.service";
import { UserRole } from "@scriptgrade/domain";

export type JwtPayload = {
  sub: string;
  role: UserRole;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService<AppConfig, true>,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.sg_access as string | null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey:
        config.get("jwt", { infer: true })?.secret ??
        process.env.JWT_SECRET ??
        "dev-only-change-me",
    });
  }

  async validate(payload: JwtPayload): Promise<Actor> {
    const account = await this.prisma.userAccount.findUnique({
      where: { id: payload.sub },
    });
    if (!account) throw new UnauthorizedException();
    return {
      accountId: account.id,
      role: account.role,
      studentId: account.studentId,
      lecturerId: account.lecturerId,
      adminEmail: account.adminEmail,
      locale: account.locale,
    };
  }
}
