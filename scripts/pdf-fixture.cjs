// Synthetic, owned PDF bytes for guards/manual demo. No real resume data.
const {createHash}=require('node:crypto');
const md5=data=>createHash('md5').update(data).digest();
function rc4(key,input){const s=Array.from({length:256},(_,i)=>i);let j=0;for(let i=0;i<256;i++){j=(j+s[i]+key[i%key.length])%256;[s[i],s[j]]=[s[j],s[i]];}let i=0;j=0;return Buffer.from([...input].map(value=>{i=(i+1)%256;j=(j+s[i])%256;[s[i],s[j]]=[s[j],s[i]];return value^s[(s[i]+s[j])%256];}));}
function pdfFixture(text='SYNTHETIC RESUME - Sam Fixture\nEducation: CVR demonstration only\nSkills: JavaScript, algorithms, teamwork',{encrypted=false,padding=0,pages=1}={}){
  const literal=text.replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)').replace(/\r?\n/g,') Tj 0 -18 Td (');
  let stream=Buffer.from(`BT /F1 ${text.length > 8000 ? '0.01' : '12'} Tf 50 740 Td (${literal}) Tj ET`,'ascii');
  let encryption='',trailer='';
  if(encrypted){
    const pad=Buffer.from('28bf4e5e4e758a4164004e56fffa01082e2e00b6d0683e802f0ca9fe6453697a','hex');
    const password=value=>Buffer.concat([Buffer.from(value),pad]).subarray(0,32);
    const owner=rc4(md5(password('fixture-owner')).subarray(0,5),password('fixture-password'));
    const id=md5(Buffer.from('synthetic-interview-encrypted-fixture')),permissions=Buffer.alloc(4);permissions.writeInt32LE(-4);
    const key=md5(Buffer.concat([password('fixture-password'),owner,permissions,id])).subarray(0,5),user=rc4(key,pad);
    stream=rc4(md5(Buffer.concat([key,Buffer.from([5,0,0,0,0])])).subarray(0,10),stream);
    encryption=`<< /Filter /Standard /V 1 /R 2 /Length 40 /O <${owner.toString('hex')}> /U <${user.toString('hex')}> /P -4 >>`;
    trailer=` /Encrypt 6 0 R /ID [<${id.toString('hex')}> <${id.toString('hex')}>]`;
  }
  const objects=['<< /Type /Catalog /Pages 2 0 R >>',`<< /Type /Pages /Kids [${Array.from({length:pages},()=> '3 0 R').join(' ')}] /Count ${pages} >>`,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',Buffer.concat([Buffer.from(`<< /Length ${stream.length} >>\nstream\n`),stream,Buffer.from('\nendstream')])];
  if(encrypted)objects.push(encryption);
  const chunks=[Buffer.from('%PDF-1.4\n')],offsets=[0];let size=chunks[0].length;
  objects.forEach((object,index)=>{offsets.push(size);const bytes=Buffer.concat([Buffer.from(`${index+1} 0 obj\n`),Buffer.isBuffer(object)?object:Buffer.from(object),Buffer.from('\nendobj\n')]);chunks.push(bytes);size+=bytes.length;});
  chunks.push(Buffer.from(`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(offset=>String(offset).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size ${objects.length+1} /Root 1 0 R${trailer} >>\nstartxref\n${size}\n%%EOF\n`));
  if(padding)chunks.push(Buffer.alloc(padding,32));return Buffer.concat(chunks);
}
module.exports={pdfFixture};
