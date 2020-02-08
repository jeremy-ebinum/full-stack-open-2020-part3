const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const jsonParser = bodyParser.json();
const uniqueRandom = require("unique-random");
const random = uniqueRandom(1, 10000);
const morgan = require("morgan");

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

morgan.token("data", function(req, res) {
  const body = req.body;

  return JSON.stringify(body);
});

app.use(
  morgan(":method :url :status :res[content-length] - :response-time ms :data")
);

app.get("/api/persons", (req, res) => {
  res.json(persons);
});

app.get("/api/persons/:id", (req, res) => {
  const id = Number(req.params.id);

  const person = persons.find(person => person.id === id);

  if (person) {
    res.json(person);
  } else {
    res.status(404).end();
  }
});

app.get("/info", (req, res) => {
  const message =
    `<p>Phonebook has info for ${persons.length} people</p>` +
    `<p>${new Date()}</p>`;

  res.send(message);
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

app.post("/api/persons", jsonParser, (req, res) => {
  const body = req.body;

  if (!body.name || !body.number) {
    return res.status(400).json({
      error: "Invalid data: empty name and/or number"
    });
  }

  const nameExists = persons.some(person => person.name === body.name);

  if (nameExists) {
    return res.status(422).json({
      error: "A person with this name already exists"
    });
  }

  const person = {
    name: body.name,
    number: body.number,
    id: random()
  };

  persons = persons.concat(person);

  res.json(person);
});

const PORT = 3001;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
