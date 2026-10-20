import test from 'node:test';
import assert from 'node:assert/strict';
import { themeStyle, contrastRatio } from '../../apps/web/src/utils/collegeThemes.js';
import { readFileSync } from 'node:fs';
test('college identity cannot replace neutral reading or control tokens', () => {
  const style = themeStyle({accent:'#FFFFFF',text:'#FFFFFF',background:'#FFFFFF',extra:'url(evil)'});
  assert.equal(style['--hub-accent'],'#FFFFFF');
  assert.ok(contrastRatio(style['--hub-accent'],style['--hub-on-accent'])>=4.5);
  assert.equal(style['--background'],undefined);
  assert.equal(style['--extra'],undefined);
  assert.match(themeStyle({accent:'url(evil)'})['--hub-accent'],/^#[0-9A-Fa-f]{6}$/);
  for(const accent of ['#777777','#FFFFFF','#000000','#310A31','#DFF7FF','#5B3FD6']) {
    assert.ok(contrastRatio(accent,themeStyle({accent})['--hub-on-accent'])>=4.5,accent);
  }
});
test('semantic foreground, status, control and focus pairings meet contrast gates', () => {
  const css=readFileSync(new URL('../../apps/web/src/styles/tokens.css',import.meta.url),'utf8');
  const tokens=Object.fromEntries([...css.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})/gi)].map(m=>[m[1],m[2]]));
  for(const surface of ['canvas','panel','panel-subtle']) {
    for(const ink of ['ink','ink-muted','primary','negative']) assert.ok(contrastRatio(tokens[ink],tokens[surface])>=4.5,`${ink}/${surface}`);
    for(const ink of ['line','focus']) assert.ok(contrastRatio(tokens[ink],tokens[surface])>=3,`${ink}/${surface}`);
  }
  for(const name of ['positive','caution','negative','info']) assert.ok(contrastRatio(tokens[name],tokens[name+'-surface'])>=4.5,name);
  for(const primary of ['primary','primary-hover']) assert.ok(contrastRatio(tokens['on-primary'],tokens[primary])>=4.5,primary);
  for(const ink of ['hero-ink','hero-muted']) assert.ok(contrastRatio(tokens[ink],tokens['hero-surface'])>=4.5,ink);
  assert.ok(contrastRatio(tokens['focus-on-dark'],tokens['hero-surface'])>=3);
  for(const background of ['#43348D','#145B63']) {
    assert.ok(contrastRatio(tokens['hero-muted'],background)>=4.5);
    assert.ok(contrastRatio(tokens['focus-on-dark'],background)>=3);
  }
  for(const background of ['#F5F3E8','#E4ECAA']) {
    assert.ok(contrastRatio(tokens.ink,background)>=4.5);
    assert.ok(contrastRatio(tokens['ink-muted'],background)>=4.5);
    assert.ok(contrastRatio(tokens.focus,background)>=3);
  }
  assert.ok(contrastRatio('#FFFFFF','#2447E8')>=4.5);
  assert.ok(contrastRatio('#656D56','#E4ECAA')>=3);
});
