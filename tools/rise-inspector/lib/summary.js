function sortedEntries(object) {
  return Object.entries(object || {}).sort((a, b) => b[1] - a[1]);
}

module.exports = function summary(data) {
  const lines = [];
  lines.push('');
  lines.push('RISE INSPECTOR');
  lines.push('==============');
  lines.push('');
  lines.push('Course: ' + data.course.title);
  lines.push('Lessons: ' + data.course.lessonCount);
  lines.push('Content blocks: ' + data.course.totalBlocks);
  lines.push('Assessment questions: ' + data.course.totalQuestions);
  lines.push('Assets: ' + data.assets.total);
  lines.push('');
  lines.push('LESSONS');
  lines.push('-------');

  data.lessons.forEach((lesson) => {
    lines.push(lesson.number + '. ' + lesson.title + ' [' + lesson.type + ']');
    sortedEntries(lesson.itemTypes).forEach(([type, count]) => {
      lines.push('   ' + count + ' x ' + type);
    });
  });

  lines.push('');
  return lines.join('\n');
};
