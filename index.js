const express = require("express");
const app = express();
const { handleError, ErrorHandler } = require("./helpers/error");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const cors = require("cors");

const Person = require("./models/person");

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

const createUpdateMiddlewares = [cors(), jsonParser, jsonParserErrorHandler];

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
});

app.get("/api/persons/:id", (req, res, next) => {
  Person.findById(req.params.id)
    .then(person => {
      if (person) {
        res.json(person.toJSON());
      } else {
        res.status(404).end();
      }
    })
    .catch(err => {
      console.error(err);
      if (err.name === "CastError" && err.kind === "ObjectId") {
        next(new ErrorHandler(400, "Malformed Id"));
      }

      next(err);
    });
});

app.get("/info", (req, res, next) => {
  Person.estimatedDocumentCount({})
    .then(count => {
      const message =
        `<p>Phonebook has info for ${count} people</p>` +
        `<p>${new Date()}</p>`;
      res.send(message);
    })
    .catch(err => {
      console.error(err);
      next(err);
    });
});

app.delete("/api/persons/:id", (req, res) => {
  Person.findByIdAndDelete(req.params.id)
    .then(deletedPerson => {
      if (deletedPerson) {
        res.status(204).end();
      } else {
        res.status(404).end();
      }
    })
    .catch(err => {
      console.error(err);
      if (err.name === "CastError" && err.kind === "ObjectId") {
        next(new ErrorHandler(400, "Malformed Id"));
      }

      next(err);
    });
});

app.post("/api/persons", createUpdateMiddlewares, (req, res, next) => {
  const body = req.body;

  if (!allowedPostContentTypes.includes(req.header("Content-Type"))) {
    throw new ErrorHandler(400, "Unsupported content type");
  }

  if (!body.name || !body.number) {
    throw new ErrorHandler(400, "Missing name and/or number fields");
  }

  Person.exists({ name: body.name }, (err, exists) => {
    if (err) next(err);
    if (exists) {
      next(new ErrorHandler(422, "A person with this name already exists"));
    }
  });

  const person = new Person({
    name: body.name,
    number: body.number
  });

  person
    .save()
    .then(result => {
      res.json(person.toJSON());
    })
    .catch(err => {
      console.error(error);
      next(err);
    });
});

app.put("/api/persons/:id", createUpdateMiddlewares, (req, res, next) => {
  const body = req.body;

  if (!allowedPostContentTypes.includes(req.header("Content-Type"))) {
    throw new ErrorHandler(400, "Unsupported content type");
  }

  if (!body.name || !body.number) {
    throw new ErrorHandler(400, "Missing name and/or number fields");
  }

  const person = {
    name: body.name,
    number: body.number
  };

  Person.findByIdAndUpdate(req.params.id, person, {
    new: true
  })
    .then(updatedPerson => {
      if (updatedPerson) {
        res.json(updatedPerson.toJSON());
      } else {
        res.status(404).end();
      }
    })
    .catch(err => {
      console.error(err);
      if (err.name === "CastError" && err.kind === "ObjectId") {
        next(new ErrorHandler(400, "Malformed Id"));
      }

      next(err);
    });
});

app.use((err, req, res, next) => {
  if (!err) next();

  if (err instanceof ErrorHandler) {
    handleError(err, res);
  } else {
    next(err);
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
