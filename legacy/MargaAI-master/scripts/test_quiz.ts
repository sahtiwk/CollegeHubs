async function test() {
  const res = await fetch('http://localhost:3000/api/quiz/next', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nodeId: 'introduction_to_python', mode: 'checkpoint' })
  });
  const text = await res.text();
  console.log(`Status: ${res.status}`);
  console.log(text);
}

test().catch(console.error);
