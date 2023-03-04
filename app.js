const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());
const dataPath = path.join(__dirname, "covid19IndiaPortal.db");
let dataBase = null;
connectServerAndDb = async () => {
  try {
    dataBase = await open({
      filename: dataPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is running :http://localhost/3000/");
    });
  } catch (error) {
    console.log(`Error :${error.message}`);
  }
};
connectServerAndDb();

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

const desiredStatesOutput = (eachObject) => {
  return {
    stateId: eachObject.state_id,
    stateName: eachObject.state_name,
    population: eachObject.population,
  };
};

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const userQuery = `select * from user where username="${username}";`;
  const userDb = await dataBase.get(userQuery);
  console.log(userDb);
  if (userDb === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    isPasswordValid = await bcrypt.compare(password, userDb.password);
    console.log(isPasswordValid);
    if (isPasswordValid) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//API2
app.get("/states/", authenticateToken, async (request, response) => {
  const statesQuery = `select * from state;`;
  const statesQueryResponse = await dataBase.all(statesQuery);
  response.send(
    statesQueryResponse.map((eachObject) => desiredStatesOutput(eachObject))
  );
});

//API3

app.get("/states/:stateId/", authenticateToken, async (request, response) => {
  const { stateId } = request.params;
  const statesQuery = `select * from state where state_id=${stateId};`;
  const statesQueryResponse = await dataBase.get(statesQuery);
  response.send(desiredStatesOutput(statesQueryResponse));
});

//API4
app.post("/districts/", authenticateToken, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const districtQuery = `insert into district(district_name,state_id,cases,cured,active,deaths)
   values('${districtName}',${stateId},${cases},${cured},${active},${deaths});`;
  await dataBase.run(districtQuery);
  response.send("District Successfully Added");
});

const districtDetails = (eachDistrict) => {
  return {
    districtId: eachDistrict.district_id,
    districtName: eachDistrict.district_name,
    stateId: eachDistrict.state_id,
    cases: eachDistrict.cases,
    cured: eachDistrict.cured,
    active: eachDistrict.active,
    deaths: eachDistrict.deaths,
  };
};

//API5
app.get(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const districtQuery = `select * from district where district_id=${districtId};`;
    const districtQueryResponse = await dataBase.get(districtQuery);
    response.send(districtDetails(districtQueryResponse));
  }
);

//API6
app.delete(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const districtQuery = `delete from district where district_id=${districtId};`;
    const districtQueryResponse = await dataBase.run(districtQuery);
    response.send("District Removed");
  }
);

//API7
app.put(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;
    const districtQuery = `update district 
    set
    district_name='${districtName}',
    state_id=${stateId},
    cases=${cases},
    cured=${cured},
    active=${active},
    deaths=${deaths}
    where district_id=${districtId};`;
    const districtQueryResponse = await dataBase.run(districtQuery);
    response.send("District Details Updated");
  }
);

//API8
app.get(
  "/states/:stateId/stats/",
  authenticateToken,
  async (request, response) => {
    const { stateId } = request.params;
    const staticsQuery = `select sum(cases) as totalCases ,sum(cured) as totalCured,
    sum(active) as totalActive,sum(deaths) as totalDeaths from district where state_id=${stateId};`;
    const staticsQueryResponse = await dataBase.get(staticsQuery);
    response.send(staticsQueryResponse);
  }
);

module.exports = app;
