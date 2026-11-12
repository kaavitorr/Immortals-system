import {elementalDivineSenseProfile} from '../../systems/elemental-perception.mjs';
/** Selective Divine Sense: its target filter never changes ordinary sight or global visibility. */
export class DetectionModeDivineSense extends foundry.canvas.perception.DetectionMode {
 constructor(){super({id:'immortalsDivineSense',label:'Sentido Divino',type:foundry.canvas.perception.DetectionMode.DETECTION_TYPES.OTHER,walls:false,angle:false});}
 _canDetect(visionSource,target){return elementalDivineSenseProfile(visionSource.object?.document?.actor,{target:target?.document?.actor}).canDetect;}
}
CONFIG.Canvas.detectionModes.immortalsDivineSense=new DetectionModeDivineSense();
