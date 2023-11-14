const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "cricketMatchDetails.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const convertDbObjectToResponseObject = (dbObject) => {
  return {
    playerId: dbObject.player_id,
    playerName: dbObject.player_name,
  };
};

app.get("/players/", async (request, response) => {
  const playerQuery = `select * from player_details`;
  const playerDetails = await db.all(playerQuery);
  const transformedObject = playerDetails.map((eachPlayer) => {
    return convertDbObjectToResponseObject(eachPlayer);
  });
  response.send(transformedObject);
});

app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const certainPlayerQuery = `select * from player_details where player_id = ${playerId}`;
  const playerDetails = await db.get(certainPlayerQuery);
  response.send(convertDbObjectToResponseObject(playerDetails));
});

app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const playerNameDetails = request.body;
  const { playerName } = playerNameDetails;
  const updatePlayerQuery = `update player_details set player_name = '${playerName}' where player_id = ${playerId}`;
  await db.run(updatePlayerQuery);
  response.send("Player Details Updated");
});

const convertMatchDetails = (dbObject) => {
  return {
    matchId: dbObject.match_id,
    match: dbObject.match,
    year: dbObject.year,
  };
};

app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const matchQuery = `select * from match_details where match_id = ${matchId}`;
  const matchDetails = await db.get(matchQuery);
  response.send(convertMatchDetails(matchDetails));
});

app.get("/players/:playerId/matches/", async (request, response) => {
  const { playerId } = request.params;
  const getQuery = `select * from player_details natural join match_details where player_id = ${playerId}`;
  const matchDetails = await db.all(getQuery);
  const transformedObject = matchDetails.map((eachPlayer) => {
    return convertMatchDetails(eachPlayer);
  });
  response.send(transformedObject);
});

const convertPlayerMatchScore = (dbObject) => {
  return {
    playerMatchId: dbObject.player_match_id,
    playerId: dbObject.player_id,
    matchId: dbObject.match_id,
    score: dbObject.score,
    fours: dbObject.fours,
    sixes: dbObject.sixes,
  };
};

app.get("/players/:matchId/players/", async (request, response) => {
  const { matchId } = request.params;
  const getQuery = `select * from player_details natural join player_match_score where match_id = ${matchId}`;
  const playersDetails = await db.all(getQuery);
  const transformedObject = playersDetails.map((eachMatch) => {
    return convertPlayerMatchScore(eachMatch);
  });
  response.send(transformedObject);
});

app.get("/players/:playerId/playerScores/", async (request, response) => {
  const { playerId } = request.params;
  const playerQuery = `select player_details.player_id AS playerId,player_details.player_name AS playerName, SUM(player_match_score.score) AS totalScore, SUM(fours)  AS totalFours, SUM(sixes) AS totalSixes from player_details INNER JOIN player_match_score ON player_details.player_id = player_match_score.player_id where player_details.player_id = ${playerId}`;
  const totalPlayerScore = await db.get(playerQuery);
  response.send(totalPlayerScore);
});

module.exports = app;
