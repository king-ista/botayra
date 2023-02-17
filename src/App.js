
import React,{ useEffect, useRef, useState} from 'react';
import {Howl} from 'howler';
import { initNotifications, notify } from '@mycv/f8-notification';
import * as mobilenet from '@tensorflow-models/mobilenet'
import * as knnClassifier from '@tensorflow-models/knn-classifier'
import './App.css';
import soundURL from './assets/hey_sondn.mp3';
var sound = new Howl({
  src: [soundURL]
});


const NOT_TOUCH_LABEL = 'not_touch';
const TOUCHED_LABEL = 'touched';
const TRAINING_TIMES = 50;
const TOUCHED_CONFIDENCE = 0.8;
function App() {
  const video = useRef();
  const mobilenetModule = useRef();
  const canPlaySound = useRef(true);
  const classifier = useRef();
  const [touched, setTouched] = useState(false);


  const init = async () => {
    console.log('init...');
await setupCamera();
console.log('setup camera success')
 mobilenetModule.current = await mobilenet.load();
 classifier.current = knnClassifier.create();
console.log('setup done');
console.log('Không chạm tay lên mặt và bấm Train 1');
initNotifications({ cooldown: 3000 });
  }
  const setupCamera = () => {
return new Promise((resolve, reject) =>{
  navigator.getUserMedia=navigator.getUserMedia ||
  navigator.webkitGetUserMedia ||
  navigator.mozGetUserMedia ||
  navigator.msGetUserMedia
  if (navigator.getUserMedia){
    navigator.getUserMedia(
      {video: true},
      stream =>{
video.current.srcObject = stream;
video.current.addEventListener('loadeddata', resolve)
      },
      error =>reject(error)
      );
  }else {
    reject();
  }
})
  }
  const train = async label => {
    console.log(`[${label}] Đang train cho máy mặt đẹp trai của bạn...`)
for (let i = 0; i < TRAINING_TIMES; ++i){
  console.log(`Progress ${parseInt((i+1) / TRAINING_TIMES * 100 )}%`)
  await training(label);
}
  }
  /**
   * Bước 1: Train cho máy khuôn mặt không chạm tay
   * Bước 2: Train cho máy khuôn mặt có chạm tay
   * Bước 3: Lấy hình ảnh hiện tại,phân tích và so sánh với đã học trước đó
   * ==> Nếu mà matching với data khuôn mặt chạm tay ==> Cảnh báo
   * @param {*} label 
   * //@returns 
   */
  const training = label => {
    return new Promise(async resolve  =>{
      const embedding =  mobilenetModule.current.infer(
        video.current,
        true
      );
      classifier.current.addExample(embedding, label);
      await sleep(100);
      resolve();
    });
  }
  const run = async () =>{
    const embedding =  mobilenetModule.current.infer(
      video.current,
      true
    );
    const result = await classifier.current.predictClass(embedding);
   
    // console.log('Label:' , result.label);
    // console.log('Confidences:' , result.confidences);
    if (
      result.label === TOUCHED_LABEL &&
      result.confidences[result.label] > TOUCHED_CONFIDENCE
      ){
      console.log('Touched');
      if (canPlaySound.current){
        canPlaySound.current = false;
        sound.play();
      }
      notify('Bỏ tay ra!', { body: 'Bạn vừa chạm tay vào mặt!' });
      setTouched(true);
    } else {
      console.log('Not touch');
       setTouched(false);
    }
    await sleep(200);
    run();
  }
  const sleep = ( ms = 0) => {
    return new Promise(resolve => setTimeout(resolve, ms ))
  }
  useEffect(() => {
init();
sound.on('end', function(){
  canPlaySound.current = true;
});
//cleanup
return () => {

}
  }, []);
  return (
    <div className={`main ${touched ? 'touched' : ''}`}>
   <video
   ref={video}
   className="video" 
   autoPlay
   />
   <div className="control"> 
   <button className="btn" onClick={() => train(NOT_TOUCH_LABEL)}>Train 1</button>
   <button className="btn" onClick={() => train(TOUCHED_LABEL)}>Train 2</button>
   <button className="btn" onClick={() => {}}>Run</button>
    </div>
    </div>

  );
}

export default App;
