FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY services/catalog/Catalog.Api/Catalog.Api.csproj services/catalog/Catalog.Api/
COPY services/common/Backend.Validation/Backend.Validation.csproj services/common/Backend.Validation/
RUN dotnet restore services/catalog/Catalog.Api/Catalog.Api.csproj

COPY services/catalog/Catalog.Api/ services/catalog/Catalog.Api/
COPY services/common/Backend.Validation/ services/common/Backend.Validation/
WORKDIR /src/services/catalog/Catalog.Api
RUN dotnet publish Catalog.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

COPY --from=build /app/publish ./
ENTRYPOINT ["dotnet", "Catalog.Api.dll"]
