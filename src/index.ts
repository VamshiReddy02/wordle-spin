import { Kv, ResponseBuilder } from "@fermyon/spin-sdk";
import { v4 as uuidv4 } from 'uuid';

interface InternalGame {
  id: string,
  solution: string,
  grid: string[][],
  currentRow: number,
  solved: boolean
}

interface Response {
  message: string,
  gameId?: string,
  grid?: string[][],
  currentRow?: number,
  solved?: boolean,
  correctLetters?: string[]
}

const dictionary = ["apple", "again", "alarm", "alone", "along"];
const decoder = new TextDecoder();

export async function handler(req: Request, res: ResponseBuilder) {
  const store = Kv.openDefault();
  const response: Response = { message: "" };
  let status = 200;
  let body: string | undefined;

  try {
    if (req.method === "POST" && req.url.toLowerCase().includes("/api/start")) {
      const id = uuidv4();
      const solution = dictionary[Math.floor(Math.random() * dictionary.length)];

      const internalGame: InternalGame = {
        id: id,
        solution: solution,
        grid: Array(6).fill([]).map(() => Array(5).fill("")),
        currentRow: 0,
        solved: false
      };

      await store.set(id, JSON.stringify(internalGame));
      response.gameId = internalGame.id;
      response.grid = internalGame.grid;
      response.currentRow = internalGame.currentRow;
      response.solved = internalGame.solved;
      response.message = "The game has started, start guessing the word";

      body = JSON.stringify(response);
      res.headers.set("content-type", "application/json");
      res.status(status).send(body);
      return;
    }

    if (req.method === "GET" && req.url.toLowerCase().includes("/api/guess")) {
      const url = new URL(req.url, `http://${req.headers.get("host")}`);
      const id = url.searchParams.get("gameId");
      const guess = url.searchParams.get("guess");

      if (!id || !guess) {
        status = 400;
        response.message = "Missing gameId or guess in the query parameters";
        body = JSON.stringify(response);
        res.headers.set("content-type", "application/json");
        res.status(status).send(body);
        return;
      }

      const val = store.get(id);
      if (!val) {
        status = 404;
        response.message = `Game with id: ${id} not found`;
        body = JSON.stringify(response);
        res.headers.set("content-type", "application/json");
        res.status(status).send(body);
        return;
      }

      const internalGame: InternalGame = JSON.parse(decoder.decode(val));

      if (guess.length !== 5 || !/^[a-zA-Z]+$/.test(guess)) {
        status = 400;
        response.message = "Guess must be a 5-letter word.";
        body = JSON.stringify(response);
        res.headers.set("content-type", "application/json");
        res.status(status).send(body);
        return;
      }

      const normalizedGuess = guess.toLowerCase();

      if (!dictionary.includes(normalizedGuess)) {
        status = 400;
        response.message = "Not a valid word.";
        body = JSON.stringify(response);
        res.headers.set("content-type", "application/json");
        res.status(status).send(body);
        return;
      }

      internalGame.grid[internalGame.currentRow] = normalizedGuess.split("");

      const correctLetters = Array(5).fill("_");
      for (let i = 0; i < normalizedGuess.length; i++) {
        if (normalizedGuess[i] === internalGame.solution[i]) {
          correctLetters[i] = normalizedGuess[i];
        }
      }

      if (normalizedGuess === internalGame.solution) {
        internalGame.solved = true;
        response.message = "Congratulations!";
      } else if (internalGame.currentRow === 5) {
        response.message = `Game over. The word was ${internalGame.solution}.`;
      } else {
        response.message = `Keep trying! Correct letters: ${correctLetters.filter(l => l !== "_").join(", ")}`;
        internalGame.currentRow++;
      }

      await store.set(internalGame.id, JSON.stringify(internalGame));

      response.gameId = internalGame.id;
      response.grid = internalGame.grid;
      response.currentRow = internalGame.currentRow;
      response.solved = internalGame.solved;
      response.correctLetters = correctLetters;

      body = JSON.stringify(response);
      res.headers.set("content-type", "application/json");
      res.status(status).send(body);
      return;
    }

    status = 400;
    response.message = "Invalid request";
    body = JSON.stringify(response);
    res.headers.set("content-type", "application/json");
    res.status(status).send(body);

  } catch (error) {
    status = 500;
    response.message = "Internal Server Error";
    body = JSON.stringify(response);
    res.headers.set("content-type", "application/json");
    res.status(status).send(body);
  }
}
