FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY services/order/Order.Api/Order.Api.csproj services/order/Order.Api/
COPY services/common/Backend.Validation/Backend.Validation.csproj services/common/Backend.Validation/
RUN dotnet restore services/order/Order.Api/Order.Api.csproj

COPY services/order/Order.Api/ services/order/Order.Api/
COPY services/common/Backend.Validation/ services/common/Backend.Validation/
WORKDIR /src/services/order/Order.Api
RUN dotnet publish Order.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

COPY --from=build /app/publish ./
ENTRYPOINT ["dotnet", "Order.Api.dll"]
