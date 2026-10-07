// Original short descriptions; linked reading belongs to MDN contributors.
// Reading descriptions for the versioned P9.2 curriculum; private questions live separately.
export const curriculumVersion = 'demo-v1';
export const starterPaths = {
  dsa: { label: 'Data structures & algorithms', description: 'Start with collections, then follow how an algorithm visits them.', nodes: [
    { slug: 'arrays', label: 'Arrays & indexed collections', description: 'Represent an ordered sequence and access an item by its position.', prerequisite: null,
      resource: { title: 'Indexed collections', summary: 'Read about creating arrays, accessing their elements and working with array methods.', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Indexed_collections' } },
    { slug: 'iteration', label: 'Iteration & traversal', description: 'Trace a loop and describe how it visits the elements in a sequence.', prerequisite: 'arrays',
      resource: { title: 'Loops and iteration', summary: 'Compare loop forms and practice following their control flow one step at a time.', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Loops_and_iteration' } }
  ] },
  web: { label: 'Web development', description: 'Give a page its structure, then learn how to style it.', nodes: [
    { slug: 'html', label: 'HTML foundations', description: 'Describe page structure using elements, attributes and careful nesting.', prerequisite: null,
      resource: { title: 'Basic HTML syntax', summary: 'Explore elements and attributes, then practice structuring a short document.', url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content/Basic_HTML_syntax' } },
    { slug: 'css', label: 'CSS foundations', description: 'Connect style rules to HTML elements through selectors.', prerequisite: 'html',
      resource: { title: 'What is CSS?', summary: 'See how style rules control presentation and how CSS connects to an HTML document.', url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/What_is_CSS' } }
  ] }
} as const;
export type Domain = keyof typeof starterPaths;
