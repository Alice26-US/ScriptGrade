import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { JsonExceptionFilter } from "./common/filters/json-exception.filter";
import { AppModule } from "./app.module";
import { AppConfig } from "./config/configuration";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<AppConfig, true>);
  app.setGlobalPrefix("api");
  app.use(cookieParser());
  app.enableCors({
    origin: config.get("webOrigin", { infer: true }),
    credentials: true,
  });
  app.useGlobalFilters(new JsonExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  const port = config.get("port", { infer: true });
  await app.listen(port);
}

bootstrap();
