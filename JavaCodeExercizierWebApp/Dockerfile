FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY JavaCodeExercizierWebApp/*.csproj ./JavaCodeExercizierWebApp/
RUN dotnet restore JavaCodeExercizierWebApp/JavaCodeExercizierWebApp.csproj

COPY . .
RUN dotnet publish JavaCodeExercizierWebApp/JavaCodeExercizierWebApp.csproj -c Release -o /out

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /out .
EXPOSE 80
ENV ASPNETCORE_URLS=http://+:80
ENTRYPOINT ["dotnet", "JavaCodeExercizierWebApp.dll"]
