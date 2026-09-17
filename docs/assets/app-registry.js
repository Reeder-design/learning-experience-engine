(() => {
  const apps = {
    workbench: {
      internalId: 'workbench',
      displayName: 'Learning Project Workbench',
      route: 'workbench/index.html',
      purpose: 'Create, transform, preview, and reuse learning projects from source content or existing projects.'
    },
    'course-composer': {
      internalId: 'course-composer',
      displayName: 'Course Builder',
      route: 'course-composer/index.html',
      legacyDisplayNames: ['Course Composer'],
      purpose: 'Fine-tune and assemble a complete course when manual course editing is useful.'
    },
    'component-studio': {
      internalId: 'component-studio',
      displayName: 'Interaction Builder',
      route: 'component-studio/index.html',
      legacyDisplayNames: ['Component Studio'],
      purpose: 'Fine-tune reusable learner interactions.'
    },
    'scenario-builder': {
      internalId: 'scenario-builder',
      displayName: 'Scenario Builder',
      route: 'scenario-builder/index.html',
      purpose: 'Fine-tune branching practice scenarios and coaching paths.'
    }
  };

  Object.values(apps).forEach((app) => Object.freeze(app));
  window.LX_APP_REGISTRY = Object.freeze(apps);
  window.LX_APP_NAME = (internalId) => apps[internalId]?.displayName || internalId;
})();
