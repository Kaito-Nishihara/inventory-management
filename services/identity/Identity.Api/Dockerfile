FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY services/identity/Identity.Api/Identity.Api.csproj services/identity/Identity.Api/
COPY services/common/Backend.Validation/Backend.Validation.csproj services/common/Backend.Validation/
RUN dotnet restore services/identity/Identity.Api/Identity.Api.csproj

COPY services/identity/Identity.Api/ services/identity/Identity.Api/
COPY services/common/Backend.Validation/ services/common/Backend.Validation/
WORKDIR /src/services/identity/Identity.Api
RUN dotnet publish Identity.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

COPY --from=build /app/publish ./
ENTRYPOINT ["dotnet", "Identity.Api.dll"]
