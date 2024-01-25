import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'


function toggleMusic(play) {
  if (play) {
      audioElement.play();
  } else {
      audioElement.pause();
  }
}

function setVolume(volume) {
  audioElement.volume = volume;
}

document.body.addEventListener('click', () => {
  if (audioContext.state === 'suspended') {
      audioContext.resume();
  }
});


let initialPositions = null;

function saveInitialPositions() {
  if (!points) return;

  const positions = points.geometry.attributes.position.array;
  const len = positions.length;


  initialPositions = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    initialPositions[i] = positions[i];
  }
}
/**
 * Base
 */
// Debug

const gui = new GUI()
const musicControls = { playMusic: true };
const audioControls = { volume: 1 };

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()


// Galaxy
const parameters = {}
parameters.count = 50000
parameters.size = 0.04
parameters.radius = 5
parameters.branches = 3
parameters.spin = 1
parameters.randomness = 0.2
parameters.randomnessPower = 3
// parameters.insideColor = '#FF0000'
// parameters.outsideColor = '#0000FF'

let geometry = null
let material = null
let points = null

const generateGalaxy = () =>
{
    if(points !== null)
    {
        geometry.dispose()
        material.dispose()
        scene.remove(points)
    }

    geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(parameters.count * 3)
    const colors = new Float32Array(parameters.count * 3)
    const particleTexture = new THREE.TextureLoader().load('/textures/particles/star1.png')

    const colorInside = new THREE.Color(parameters.insideColor)
    const colorOutside = new THREE.Color(parameters.outsideColor)

    for(let i = 0; i < parameters.count; i++)
    {
        const i3 = i * 3

        const radius = Math.random() * parameters.radius
        const spinAngle = radius * parameters.spin
        const branchAngle = (i % parameters.branches) / parameters.branches * Math.PI * 2

        const randomX = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : - 1)
        const randomY = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : - 1)
        const randomZ = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : - 1)


        positions[i3 + 0] = Math.cos(branchAngle + spinAngle) * radius + randomX
        positions[i3 + 1] = randomY
        positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + randomZ

        // Color

        const mixedColor = colorInside.clone()
        mixedColor.lerp(colorOutside, radius / parameters.radius)


        colors[i3 + 0] = mixedColor.r
        colors[i3 + 1] = mixedColor.g
        colors[i3 + 2] = mixedColor.b


    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    material = new THREE.PointsMaterial({
        size: parameters.size,
        sizeAttenuation: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
        map: particleTexture,
    })

    points = new THREE.Points(geometry, material)
    scene.add(points)
}

generateGalaxy()
saveInitialPositions();


gui.add(parameters, 'count').min(20000).max(100000).step(100).onFinishChange(generateGalaxy)
gui.add(parameters, 'size').min(0.001).max(0.1).step(0.001).onFinishChange(generateGalaxy)
gui.add(parameters, 'radius').min(0.01).max(20).step(0.01).onFinishChange(generateGalaxy)
gui.add(parameters, 'branches').min(2).max(20).step(1).onFinishChange(generateGalaxy)
gui.add(parameters, 'spin').min(- 5).max(5).step(0.001).onFinishChange(generateGalaxy)
gui.add(parameters, 'randomness').min(0).max(2).step(0.001).onFinishChange(generateGalaxy)
gui.add(parameters, 'randomnessPower').min(1).max(10).step(0.001).onFinishChange(generateGalaxy)
// gui.addColor(parameters, 'insideColor').onFinishChange(generateGalaxy)
// gui.addColor(parameters, 'outsideColor').onFinishChange(generateGalaxy)
gui.add(musicControls, 'playMusic').onFinishChange(toggleMusic)
gui.add(audioControls, 'volume').min(0).max(1).step(0.01).onFinishChange(setVolume)



// Web Audio API setup
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const audioElement = document.querySelector('audio');
const track = audioContext.createMediaElementSource(audioElement);
const analyser = audioContext.createAnalyser();
track.connect(analyser);
analyser.connect(audioContext.destination);

analyser.fftSize = 1024;
const bufferLength = analyser.frequencyBinCount;
const dataArray = new Uint8Array(bufferLength);


function getAudioData() {
  analyser.getByteFrequencyData(dataArray);

  let bass = 0;
  let treble = 0;
  const len = dataArray.length;


  for (let i = 0; i < len / 2; i++) {
      bass += dataArray[i];
  }
  for (let i = len / 2; i < len; i++) {
      treble += dataArray[i];
  }
  bass /= (len / 2);
  treble /= (len / 2);

  return { bass, treble };
}


function animateGalaxyColors() {
  const audioData = getAudioData();

  if (!points) return;

  const colors = points.geometry.attributes.color.array; // Référence aux couleurs initiales

  for (let i = 0; i < parameters.count; i++) {
      const i3 = i * 3;

      // Récupérer la couleur initiale du point
      const initialColor = new THREE.Color(colors[i3], colors[i3 + 1], colors[i3 + 2]);

      // Couleur basée sur l'audio
      const audioColor = new THREE.Color();
      audioColor.setHSL(audioData.bass / 255, 1, 0.5);
      audioColor.lerp(new THREE.Color(0xffaa00), audioData.treble / 255);

      // Mélanger la couleur audio avec la couleur initiale
      const finalColor = initialColor.lerp(audioColor, 0.5);

      // Affecter la couleur finale
      colors[i3] = finalColor.r;
      colors[i3 + 1] = finalColor.g;
      colors[i3 + 2] = finalColor.b;
  }

  points.geometry.attributes.color.needsUpdate = true;
}

function animateGalaxyRotation(audioData) {
  if (!points) return;


  const rotationSpeed = (audioData.bass - 128) * 0.00001;
  const rotationSpeed2 = (audioData.treble - 128) * 0.00001;

  points.rotation.y += rotationSpeed / 2;
  points.rotation.x += rotationSpeed / 4;
  points.rotation.z += rotationSpeed / 10;

  points.rotation.y += rotationSpeed2 / 2;
  points.rotation.x += rotationSpeed2 / 4;
  points.rotation.z += rotationSpeed2 / 10;


  points.rotation.y %= Math.PI * 2;
  points.rotation.x %= Math.PI * 2;
  points.rotation.z %= Math.PI * 2;

  points.geometry.attributes.position.needsUpdate = true;

}

let time = 0;

function animateGalaxyWaves(audioData) {
  if (!points) return;

  const positions = points.geometry.attributes.position.array;
  const len = positions.length;

  const waveAmplitude = 0.05;
  const waveFrequency = 0.2;
  const waveSpeed = 0.005; // Vitesse de la vague

  time += waveSpeed;

  for (let i = 0; i < len; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];


    const bassFactor = audioData.bass / 255;
    const displacement = waveAmplitude * Math.sin(waveFrequency * x + waveFrequency * z + time);


    positions[i + 1] = y + bassFactor * displacement;
  }

  points.geometry.attributes.position.needsUpdate = true;
}

let isVibrating = false;
let vibrationStartTime = 0;
const vibrationDuration = 0.05; // durée vibration

function animateGalaxyVibration(audioData) {
  if (!points || !initialPositions) return;

  const positions = points.geometry.attributes.position.array;
  const len = positions.length;

  const bassFactor = audioData.bass / 255;

  if (bassFactor > 0.5 && !isVibrating) {
    isVibrating = true;
    vibrationStartTime = Date.now();
  }

  if (isVibrating) {
    const currentTime = Date.now();
    const elapsedTime = (currentTime - vibrationStartTime) / 1000; // Temps écoulé en secondes

    for (let i = 0; i < len; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];

      const amplitude = bassFactor * 5; // amplitude de vibration
      const frequency = 2.0; // frequence de vibration
      const offsetY = amplitude * Math.sin(frequency * (elapsedTime + i * 0.1));

      positions[i + 1] = initialPositions[i + 1] + offsetY;
    }

    points.geometry.attributes.position.needsUpdate = true;


    if (elapsedTime >= vibrationDuration) {
      isVibrating = false;
    }
  }
}

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.x = 3
camera.position.y = 3
camera.position.z = 3
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/**
 * Animate
 */
const clock = new THREE.Clock()

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()

    // Update Galaxy
    // points.rotation.y = elapsedTime * 0.05;
    animateGalaxyColors();
    const audioData = getAudioData();
    animateGalaxyRotation(audioData);
    animateGalaxyWaves(audioData);
    animateGalaxyVibration(audioData);

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()

// Play audio

audioElement.play();
audioElement.volume = audioControls.volume;
