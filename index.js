const express = require("express");
const app = express();
const { handleError, ErrorHandler } = require("./helpers/error");
const bodyParser = require("body-parser");
const uniqueRandom = require("unique-random");
const random = uniqueRandom(1, 10000);
const morgan = require("morgan");
const cors = require("cors");
const mongoose = require("mongoose");

const Person = require("./models/person");

let persons = [
  {
    name: "Arto Hellas",
    number: "040-123456",
    id: 1
  },
  {
    name: "Ada Lovelace",
    number: "39-44-5323523",
    id: 2
  },
  {
    name: "Dan Abramov",
    number: "12-43-234345",
    id: 3
  },
  {
    name: "Mary Poppendieck",
    number: "39-23-6423122",
    id: 4
  }
];

const allowedPostContentTypes = [
  "application/json",
  "application/json;charset=utf-8",
  "application/json; charset=utf-8"
];

const jsonParser = bodyParser.json("application/*+json");
const jsonParserErrorHandler = (err, req, res, next) => {
  if (
    err instanceof SyntaxError &&
    err.status >= 400 &&
    err.status < 500 &&
    err.message.indexOf("JSON") !== -1
  ) {
    throw new ErrorHandler(400, "Malformed JSON");
  } else {
    next();
  }
};

morgan.token("data", function(req, res) {
  const body = req.body;

  return JSON.stringify(body);
});

app.use(
  morgan(":method :url :status :res[content-length] - :response-time ms :data")
);

app.use(express.static("build"));

app.get("/api/persons", (req, res) => {
  Person.find({}).then(persons => {
    res.json(persons.map(person => person.toJSON()));
  });
  // res.json(persons);
});

app.get("/api/persons/:id", (req, res) => {
  const isValidId = mongoose.Types.ObjectId.isValid(req.params.id);

  if (!isValidId) return res.status(404).end();

  Person.findById(req.params.id)
    .then(person => {
      if (person) {
        res.json(person.toJSON());
      } else {
        res.status(404).end();
      }
    })
    .catch(err => {
      console.error(err.message);
    });
});

app.get("/info", (req, res) => {
  Person.estimatedDocumentCount({})
    .then(count => {
      const message =
        `<p>Phonebook has info for ${count} people</p>` +
        `<p>${new Date()}</p>`;
      res.send(message);
    })
    .catch(err => {
      console.error(err);
    });
});

app.delete("/api/persons/:id", (req, res) => {
  const id = Number(req.params.id);
  const person = persons.find(person => person.id === id);

  if (person) {
    persons = persons.filter(person => person.id !== id);
    res.status(204).end();
  } else {
    res.status(404).end();
  }
});

app.post(
  "/api/persons",
  cors(),
  jsonParser,
  jsonParserErrorHandler,
  (req, res) => {
    const body = req.body;

    if (!allowedPostContentTypes.includes(req.header("Content-Type"))) {
      throw new ErrorHandler(400, "Unsupported content type");
    }

    if (!body.name || !body.number) {
      throw new ErrorHandler(400, "Missing name and/or number fields");
    }

    const nameExists = persons.some(person => person.name === body.name);

    if (nameExists) {
      throw new ErrorHandler(422, "A person with this name already exists");
    }

    const person = {
      name: body.name,
      number: body.number,
      id: random()
    };

    persons = persons.concat(person);

    res.json(person);
  }
);

app.use((err, req, res, next) => {
  if (err instanceof ErrorHandler) {
    handleError(err, res);
  } else {
    throw err;
  }
  next();
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
