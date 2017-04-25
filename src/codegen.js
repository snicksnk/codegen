const _ = require('lodash');
const co = require('co');
const Reader = require('./fileReader');



const processors = [
  {
    name: 'Repeat',
    prefix: 'rpt',
    priority: 2,
    run: (filePresent, config) => new Promise((res) => {
      console.log('Repeat!!!', filePresent.fileNameRaw);
      // TODO fix processors
      // res([]);
      res([createTask(filePresent, 'JustCopy', processors)]);
    })
  },
  {
    name: 'JustCopy',
    prefix: '',
    priority: 10,
    run: (filePresent, config) => new Promise(() => new Promise((res) => {
      console.log('JustCopy-------', filePresent, config);

      res([]);
    }))
  }
];

function makeFilePresent(path) {
  const filePath = path.split('/');
  const fileNameRaw = filePath[filePath.length - 1];
  const parts = fileNameRaw.split('__');

  const prefix = parts[1] || '';
  const args = [parts[2]];
  const postfix = parts[3];
  const filePresent = {
    path,
    pathParts: filePath,
    fileNameRaw,
    parts,
    prefix,
    args,
    postfix
  };
  return filePresent;
}

function createTask(filePresent, processorName, processors) {
  const processor = _.find(processors, (processor) => processor.name === processorName);
  return { filePresent, processor };
}

function prepareFileTasks(filePresent, processors) {
  return _.reduce(processors, (result, processor) => {
    if (filePresent.prefix === processor.prefix) {
      const filesOfProcessor = result[processor.name] || [];
      result.push(createTask(filePresent, processor.name, processors));
    }
    return result;
  }, []);
}

async function processTemplateDir(fileReader, processors) {
  let tasks = [];
  await fileReader.map(path => {
    const filePresent = makeFilePresent(path);
    const currentFileTasks = prepareFileTasks(filePresent, processors);
    tasks = [...tasks, ...currentFileTasks];
    return tasks;
  });
  return tasks;
}

function runTasks(tasks, config) {
  let tasksList = tasks;
  co(function* () {
    while (tasksList.length > 0) {
      const task = tasksList.pop();
      console.log('!!!!!11run task', task);
      const newTasks = yield task.processor.run(task.filePresent, config);
      tasksList = [...tasksList, ...newTasks];
      console.log('🐭NEW TASK LIST ===== \n', tasksList);
    }
    console.log('👀Tasks after end \n', tasksList);
  }).catch(e => console.log('errro!💆', e))
  .then(end => console.log('🎒end', end));
}

const reader = new Reader('template');


const config = {
  templateDirPath: '../template',
  resultDirPath: '../result'
}

processTemplateDir(reader, processors)
  .then(tasks => tasks)
  .then(tasks => runTasks(tasks, config));
