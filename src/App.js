import React, {useEffect, useRef, useState} from 'react';
import './App.css';
import * as mobilenet from '@tensorflow-models/mobilenet';
import * as knnClassifier from '@tensorflow-models/knn-classifier';
import {Howl} from 'howler';
import '@tensorflow/tfjs-backend-cpu';
import soundURL from './assets/hey_sondn.mp3'
import {initNotifications, notify} from '@mycv/f8-notification';

var sound = new Howl({
  src: [soundURL]
});

const NOT_TOUCH_LABEL = 'not_touch';
const TOUCHED_LABEL = 'touched';
const TRAINING_TIMES = 50;
const TOUCHED_CONFIDENCE = 0.6;

function App() {

  const video = useRef();
  const classifier = useRef();
  const canPlaySound = useRef(true);
  const mobilenetModule = useRef();
  const [touched, setTouched] = useState(false);

  const init = async() => {
    console.log('init...');
    await setupCamera();
    console.log('setup camera success');

    classifier.current = knnClassifier.create();
    mobilenetModule.current = await mobilenet.load();

    // console.log('setup done');
    // console.log('Không chạm tay lên mặt và bấm Train 1. Xong thì chạm tay lên mặt và bấm Train 2.');
    alert('Setup done!');
    alert('Không chạm tay lên mặt và bấm Train 1. Sau khi xong thì chạm tay lên mặt và bấm Train 2!')

    initNotifications({cooldown: 3000});
  }

  const setupCamera = () => {
    return new Promise((resolve, reject) => {
      navigator.getUserMedia = navigator.getUserMedia ||
      navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia ||
      navigator.msGetUserMedia;

      if(navigator.getUserMedia) {
        navigator.getUserMedia(
          {video:true},
          stream => {
            video.current.srcObject = stream;
            video.current.addEventListener('loadeddata', resolve);
          },
          error => reject(error)
        );
      } else {
        reject();
      }
    });
  }

  const train = async label => {
    for (let i=0; i<TRAINING_TIMES; ++i) {
      console.log(`Progress: ${parseInt((i+1) / TRAINING_TIMES * 100)}%`);
      if (parseInt((i+1) / TRAINING_TIMES * 100) == 100) {
        alert('Progress finished!');
      }
      await training(label);
    }
  }

  const training = label => {
    return new Promise(async resolve => {
      const embedding = mobilenetModule.current.infer( video.current, true );
      classifier.current.addExample(embedding, label);
      await sleep(10);
      resolve();
    });
  }

  const run = async () => {
    const embedding = mobilenetModule.current.infer(video.current, true);
    const result = await classifier.current.predictClass(embedding);

    console.log('Label: ', result.label);
    console.log('Confidences: ', result.confidences);

    if(result.label === TOUCHED_LABEL && 
       result.confidences[result.label] > TOUCHED_CONFIDENCE
    ) {
      if(canPlaySound.current) {
        canPlaySound.current = false;
        sound.play();
      }
      notify('Bỏ tay ra', {body: 'Bạn vừa chạm tay lên mặt!'});
      console.log('Touched');
      setTouched(true);
    } else {
      console.log('Not touch');
      setTouched(false);
    }

    await sleep(50);
    run();
  }

  const sleep = (ms=0) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  useEffect(() => {
    init();

    sound.on('end', function() {
      canPlaySound.current = true;
    });

    return() => {

    }
  }, []);

  return (
    <div className={`main ${touched ? 'touched' : ''}`}>
      <h1>--- DON'T TOUCH YOUR FACE! ---</h1>
      <div className="video-background">
        <video
          ref={video}
          className="video"
          autoPlay
        />
      </div>
      <div className="control">
        <button className="btn btn-notouch" onClick={() => train(NOT_TOUCH_LABEL)}>Train 1</button>
        <button className="btn btn-touched" onClick={() => train(TOUCHED_LABEL)}>Train 2</button>
        <button className="btn btn-run" onClick={() => run()}>Run</button>

      </div>
    </div>
  );
}

export default App;
