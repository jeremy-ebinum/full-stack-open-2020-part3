const mongoose = require("mongoose");
const { ErrorHandler } = require("../helpers/error");

const url = process.env.MONGODB_URI;
console.log("connecting to", url);
mongoose
  .connect(url, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(result => {
    console.log("connected to MongoDB");
  })
  .catch(error => {
    console.log("error connecting to MongoDB:", error.message);
  });

const personSchema = mongoose.Schema({
  name: String,
  number: String
});

personSchema.statics.savePerson = function(person) {
  return this.find({ name: person.name }).then(docs => {
    if (docs.length) {
      const error = new ErrorHandler(422, "Name exists already");
      return Promise.reject(error);
    } else {
      return person.save();
    }
  });
};

personSchema.set("toJSON", {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
  }
});

module.exports = mongoose.model("Person", personSchema, "persons");
