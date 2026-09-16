const path = require('path');

function increment(counter, key) {
  const safeKey = key || 'unknown';
  counter[safeKey] = (counter[safeKey] || 0) + 1;
}

function classifyBlock(item) {
  if (!item || typeof item !== 'object') return 'unknown';
  if (item.type && /^[A-Z_]+$/.test(item.type)) return item.type;
  const parts = [item.type, item.family, item.variant].filter(Boolean);
  return parts.length ? parts.join(' / ') : 'unknown';
}

function classifyAsset(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const groups = {
    '.jpg': 'images', '.jpeg': 'images', '.png': 'images', '.gif': 'images', '.webp': 'images', '.svg': 'images',
    '.mp4': 'video', '.webm': 'video', '.mov': 'video',
    '.mp3': 'audio', '.wav': 'audio', '.m4a': 'audio',
    '.vtt': 'captions', '.srt': 'captions',
  };
  return groups[ext] || 'other';
}

function analyzeCourse(runtimeData, assetPaths = [], metadata = {}) {
  const course = runtimeData.course || {};
  const lessons = Array.isArray(course.lessons) ? course.lessons : [];
  const lessonTypeCounts = {};
  const blockTypeCounts = {};
  const questionTypeCounts = {};
  let totalBlocks = 0;
  let totalQuestions = 0;

  const lessonSummaries = lessons.map((lesson, index) => {
    const lessonType = lesson.type || 'unknown';
    increment(lessonTypeCounts, lessonType);
    const items = Array.isArray(lesson.items) ? lesson.items : [];
    const localTypes = {};

    for (const item of items) {
      const looksLikeQuestion = lessonType === 'quiz' || (item?.type && /^[A-Z_]+$/.test(item.type));
      if (looksLikeQuestion) {
        const type = item?.type || 'UNKNOWN_QUESTION';
        increment(questionTypeCounts, type);
        increment(localTypes, type);
        totalQuestions += 1;
      } else {
        const type = classifyBlock(item);
        increment(blockTypeCounts, type);
        increment(localTypes, type);
        totalBlocks += 1;
      }
    }

    return {
      number: index + 1,
      id: lesson.id || null,
      title: lesson.title || `Lesson ${index + 1}`,
      type: lessonType,
      itemCount: items.length,
      itemTypes: localTypes,
    };
  });

  const assetTypeCounts = {};
  const assetExtensionCounts = {};
  for (const asset of assetPaths) {
    increment(assetTypeCounts, classifyAsset(asset));
    increment(assetExtensionCounts, path.extname(asset).toLowerCase() || '[none]');
  }

  return {
    inspectorVersion: '0.1.0',
    source: {
      file: metadata.sourceFile || null,
      runtimePath: metadata.runtimePath || null,
    },
    course: {
      id: course.id || null,
      title: course.title || '(Untitled course)',
      author: course.author || null,
      createdAt: course.createdAt || null,
      updatedAt: course.updatedAt || null,
      navigationMode: course.navigationMode || null,
      lessonCount: lessons.length,
      totalBlocks,
      totalQuestions,
      lessonTypeCounts,
      blockTypeCounts,
      questionTypeCounts,
    },
    lessons: lessonSummaries,
    assets: {
      total: assetPaths.length,
      typeCounts: assetTypeCounts,
      extensionCounts: assetExtensionCounts,
      files: assetPaths,
    },
    runtime: {
      topLevelKeys: Object.keys(runtimeData),
      courseKeys: Object.keys(course),
    },
  };
}

module.exports = { analyzeCourse };
