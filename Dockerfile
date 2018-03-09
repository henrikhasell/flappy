FROM microsoft/aspnetcore-build:2.0 AS build-env
WORKDIR /app
COPY . ./
RUN npm install
RUN npm run postinstall
RUN dotnet restore
RUN dotnet publish -c Release -o out

FROM microsoft/aspnetcore:2.0
WORKDIR /app
COPY --from=build-env /app/out .
ENV ASPNETCORE_ENVIRONMENT=Development
ENV LANG=en_GB.UTF-8
ENTRYPOINT ["dotnet", "Flappy.dll"]