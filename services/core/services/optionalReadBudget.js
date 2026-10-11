// One process-wide budget shared by summary and opt-in recommendation reads.
let active=0;
module.exports={acquire(){if(active>=2)return false;active++;return true;},release(){active--;}};
