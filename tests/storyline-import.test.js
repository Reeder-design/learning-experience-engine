const assert = require("assert");

const { importStorylineArchive } = require("../server/storyline-import");

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

function provide(key, value) {
  const escaped = JSON.stringify(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  return `globalProvideData('${key}','${escaped}');`;
}

function run() {
  const projectData = {
    projectId: "story-project-1",
    title: "Discovery practice",
    variables: [{ name:"CustomerName", type:"text", value:"Jordan" }],
    assetLib: [{ id:1, url:"story_content/cover.png", imageType:"png", fileSize:2400 }, { id:2, url:"story_content/video.m3u8", videoType:"hls", fileSize:2400 }],
    scenes: [{
      id:"scene-1",
      lmsId:"Customer discovery",
      sceneNumber:1,
      slides:[{ id:"slide-1", title:"Hear the signal", html5url:"html5/data/js/slide-1.js" }],
    }],
  };
  const slideData = {
    id:"slide-1",
    title:"Hear the signal",
    width:1280,
    height:720,
    transition:"fade",
    slideLayers:[{
      id:"base",
      isBaseLayer:true,
      timeline:{ duration:5000 },
      objects:[{ id:"title", kind:"shape", altText:"The customer describes repeated handoffs.", tabEnabled:true, data:{ imageLib:[{ assetId:1 }] } }, { id:"movie", kind:"video", data:{ media:{ assetId:2 } } }],
      events:[{ actions:[{ kind:"adjustvar" }] }],
    }],
  };
  const archive = storedZip([
    { name:"html5/data/js/data.js", data:provide("data", projectData) },
    { name:"html5/data/js/slide-1.js", data:provide("slide", slideData) },
    { name:"story_content/cover.png", data:"image bytes" },
    { name:"story_content/thumbnail.jpg", data:"thumbnail bytes" },
  ]);
  const imported = importStorylineArchive(archive, "discovery-practice.zip");
  const project = imported.project;
  assert.strictEqual(project.type, "storyline-experience");
  assert.strictEqual(project.title, "Discovery practice");
  assert.strictEqual(project.content.scenes.length, 1);
  assert.strictEqual(project.content.scenes[0].slides[0].title, "Hear the signal");
  assert.strictEqual(project.content.scenes[0].slides[0].layers[0].objects[0].title, "The customer describes repeated handoffs.");
  assert.deepStrictEqual(project.content.scenes[0].slides[0].layers[0].objects[0].assets, ["storyline-asset-001"]);
  assert.deepStrictEqual(project.content.scenes[0].slides[0].layers[0].objects[1].assets, ["storyline-asset-002"]);
  assert.strictEqual(project.metadata.courseCover.id, "storyline-course-cover");
  assert.strictEqual(project.metadata.importSummary.actions, 1);
  assert.strictEqual(project.metadata.importSummary.parsedSlides, 1);
  assert.strictEqual(project.metadata.import.sourceFormat, "storyline-published-web");
  assert.strictEqual(imported.previewAssets.length, 2);
  assert.throws(() => importStorylineArchive(Buffer.from("not a zip"), "source.story"), /published Storyline .zip export/);
  console.log("Storyline Workbench import draft tests passed.");
}

run();
