const express = require("express");

const app = express();
const bodyParser = require("body-parser");
const morgan = require("morgan");
const cors = require("cors");
const { handleError, ErrorHandler } = require("./helpers/error");

const Person = require("./models/person");

const jsonParser = bodyParser.json("application/*+json");
const jsonParserErrorHandler = (err, req, res, next) => {
  if (
    err instanceof SyntaxError &&
    err.status >= 400 &&
    err.status < 500 &&
    err.message.indexOf("JSON") !== -1
  ) {
    throw new ErrorHandler(400, ["Malformatted JSON"]);
  } else {
    next();
  }
};

const createUpdateMiddlewares = [cors(), jsonParser, jsonParserErrorHandler];

// eslint-disable-next-line no-unused-vars
morgan.token("data", (req, res) => {
  const { body } = req;

  return JSON.stringify(body);
});

app.use(
  morgan(":method :url :status :res[content-length] - :response-time ms :data")
);

app.use(express.static("build"));

app.get("/api/persons", (req, res) => {
  Person.find({}).then((persons) => {
    res.json(persons.map((person) => person.toJSON()));
  });
});

app.get("/api/persons/:id", (req, res, next) => {
  Person.findById(req.params.id)
    .then((person) => {
      if (person) {
        res.json(person.toJSON());
      } else {
        res.status(404).end();
      }
    })
    .catch((err) => {
      console.error(err);
      if (err.name === "CastError" && err.kind === "ObjectId") {
        next(new ErrorHandler(400, ["Malformatted Id"]));
      }

      next(err);
    });
});

app.get("/info", (req, res, next) => {
  Person.estimatedDocumentCount({})
    .then((count) => {
      const message =
        `<p>Phonebook has info for ${count} people</p>` +
        `<p>${new Date()}</p>`;
      res.send(message);
    })
    .catch((err) => {
      console.error(err);
      next(err);
    });
});

app.delete("/api/persons/:id", (req, res, next) => {
  Person.findByIdAndDelete(req.params.id)
    .then((deletedPerson) => {
      if (deletedPerson) {
        res.status(204).end();
      } else {
        res.status(404).end();
      }
    })
    .catch((err) => {
      console.error(err);
      if (err.name === "CastError" && err.kind === "ObjectId") {
        next(new ErrorHandler(400, ["Malformatted Id"]));
      }

      next(err);
    });
});

app.post("/api/persons", createUpdateMiddlewares, (req, res, next) => {
  const { body } = req;

  if (!body.name || !body.number) {
    throw new ErrorHandler(400, ["Missing name and/or number fields"]);
  }

  const person = new Person({
    name: body.name,
    number: body.number,
  });

  person
    .save()
    .then((savedPerson) => savedPerson.toJSON())
    .then((formattedPerson) => {
      res.json(formattedPerson);
    })
    .catch((err) => {
      if (err.name === "ValidatorError" || err.name === "ValidationError") {
        const keys = Object.keys(err.errors);
        const messages = keys.map((e) => {
          const error = err.errors[e];
          const field = error.path[0].toUpperCase() + error.path.substr(1);

          if (error.kind === "unique") {
            return `${field} already exists`;
          }
          if (error.kind === "minlength") {
            const length = error.message.match(/length \((\d+)\)/)[1];
            return `${field} must be at least ${length} characters long`;
          }

          return `ValidationError in ${field}`;
        });

        next(new ErrorHandler(422, messages));
      } else {
        next(err);
      }
    });
});

app.put("/api/persons/:id", createUpdateMiddlewares, (req, res, next) => {
  const { body } = req;

  if (!body.name || !body.number) {
    throw new ErrorHandler(400, ["Missing name and/or number fields"]);
  }

  const person = {
    name: body.name,
    number: body.number,
  };

  Person.findByIdAndUpdate(req.params.id, person, {
    new: true,
  })
    .then((updatedPerson) => {
      if (updatedPerson) {
        res.json(updatedPerson.toJSON());
      } else {
        res.status(404).end();
      }
    })
    .catch((err) => {
      console.error(err);
      if (err.name === "CastError" && err.kind === "ObjectId") {
        next(new ErrorHandler(400, ["Malformatted Id"]));
      }

      next(err);
    });
});

const unknownRoute = (req, res) => {
  res.status(404).end();
};

app.use(unknownRoute);

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
