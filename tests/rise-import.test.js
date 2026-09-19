const assert = require("assert");

const { buildRiseCourse, importRiseArchive } = require("../server/rise-import");

const archive = {
  entries: [
    { fileName: "assets/cover.png", isDirectory: false, uncompressedSize: 1200 },
    { fileName: "assets/intro.mp4", isDirectory: false, uncompressedSize: 4200 },
    { fileName: "assets/intro.m3u8", isDirectory: false, uncompressedSize: 4200 },
    { fileName: "content/runtime-data.js", isDirectory: false, uncompressedSize: 800 },
  ],
};

const runtimeData = {
  course: {
    id: "rise-source-01",
    title: "Product discovery foundations",
    description: "A short course for sellers.",
    lessons: [
      {
        id: "lesson-1",
        title: "Recognize the signal",
        type: "lesson",
        items: [{ id: "block-1", type: "text", title: "The customer signal", body: "Listen for repeat work." }],
      },
      {
        id: "quiz-1",
        title: "Check your understanding",
        type: "quiz",
        items: [{ id: "question-1", type: "MULTIPLE_CHOICE", prompt: "What should you ask first?", answers: [{ id: "a", text: "Where does the work slow down?", correct: true }] }],
      },
    ],
  },
};

function storedZip(entries) {
  let offset = 0;
  const locals = [];
  const centrals = [];
  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const data = Buffer.from(entry.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    locals.push(local, name, data);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);
    offset += local.length + name.length + data.length;
  }
  const centralData = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralData.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralData, end]);
}

function run() {
  const project = buildRiseCourse(runtimeData, archive, "discovery-course.zip");
  assert.strictEqual(project.type, "rise-course");
  assert.strictEqual(project.title, "Product discovery foundations");
  assert.strictEqual(project.content.lessons.length, 2);
  assert.strictEqual(project.content.lessons[0].blocks[0].content.body, "Listen for repeat work.");
  assert.strictEqual(project.content.lessons[1].kind, "assessment");
  assert.strictEqual(project.content.lessons[1].questions[0].prompt, "What should you ask first?");
  assert.strictEqual(project.metadata.import.sourceFormat, "rise-published-web");
  assert.strictEqual(project.metadata.importSummary.assets, 3);
  assert.strictEqual(project.metadata.importSummary.blocks, 1);
  assert.strictEqual(project.metadata.import.reviewRequired, true);
  assert.strictEqual(project.metadata.assetManifest.find((asset) => asset.path === "intro.m3u8").kind, "hls");

  const runtimeSource = `__jsonp("runtime-data.js","${Buffer.from(JSON.stringify(runtimeData)).toString("base64")}");`;
  const importedResult = importRiseArchive(storedZip([
    { name: "content/runtime-data.js", data: runtimeSource },
    { name: "assets/cover.png", data: "image bytes" },
  ]), "discovery-course.zip");
  const imported = importedResult.project;
  assert.strictEqual(imported.type, "rise-course");
  assert.strictEqual(imported.content.lessons[0].title, "Recognize the signal");
  assert.strictEqual(imported.metadata.importSummary.assets, 1);
  assert.strictEqual(importedResult.previewAssets.length, 1);

  assert.throws(
    () => importRiseArchive(Buffer.from("not a zip"), "not-rise.txt"),
    /published Rise .zip export/,
  );
  console.log("Rise Workbench import draft tests passed.");
}

run();
