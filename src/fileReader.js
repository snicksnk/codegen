const reader = require('recursive-readdir');

class ReaderMonad {
  constructor(path, reader) {
    this.path = path;
    this.reader = reader;
    this.pathsList = [];
    this.filesIsReaded = false;
  }

  map(f) {
    return new Promise((resolve, reject) => {
      if (!this.filesIsReaded) {
        reader(this.path, (err, pathsList) => {
          if (err) {
            reject(err);
          }
          this.pathsList = pathsList;
          this.filesIsReaded = true;
          resolve(this.pathsList.map(f));
        });
      } else {
        resolve(this.pathsList.map(f));
      }
    });
  }
}

module.exports = ReaderMonad;
