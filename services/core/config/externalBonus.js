// Prospective formula. LeetCode has no enabled adapter; only explicit fixture callers use that branch.
function amount({rating=0,leetcode=null}={}){
  if(!Number.isSafeInteger(rating)||rating < -10000||rating>10000)throw Error('Invalid current rating');
  let solved=0;
  if(leetcode){for(const difficulty of ['easy','medium','hard']){const count=leetcode[difficulty];if(!Number.isSafeInteger(count)||count<0||count>100000)throw Error('Invalid difficulty count');solved+=count;}}
  return 2*Math.max(0,rating)+10*solved;
}
module.exports={amount};
