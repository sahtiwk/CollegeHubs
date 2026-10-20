import {useEffect,useState} from 'react';
import api from '../api';
export function useIdentityCapabilities(){
 const [capabilities,setCapabilities]=useState(null);
 useEffect(()=>{let active=true;api.get('/auth/capabilities').then(({data})=>{if(active)setCapabilities(data);}).catch(()=>{});return()=>{active=false;};},[]);
 const googleEnabled=Boolean(capabilities?.google?.available && import.meta.env.VITE_GOOGLE_CLIENT_ID && capabilities.google.clientId===import.meta.env.VITE_GOOGLE_CLIENT_ID);
 return {capabilities,googleEnabled};
}
