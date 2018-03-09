FROM microsoft/aspnetcore-build:2.0 AS build-env
WORKDIR /app
COPY . ./
RUN npm install
RUN npm run postinstall
RUN dotnet restore
RUN dotnet ef migrations add initial
RUN dotnet ef database update
RUN dotnet publish -c Release -o out

FROM microsoft/aspnetcore:2.0
WORKDIR /app
COPY --from=build-env /app/out .
COPY --from=build-env /app/Flappy.sqlite3 .
ENV LANG=en_GB.UTF-8
ENTRYPOINT ["dotnet", "Flappy.dll"]
