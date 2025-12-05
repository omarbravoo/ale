import './style.css'
import ReactDOM from 'react-dom/client'
import { Canvas } from '@react-three/fiber'
import Experience2 from './Experience2.jsx'

const root = ReactDOM.createRoot(document.querySelector('#root'))

root.render(
    <Canvas
        style={{ touchAction: 'none' }}
        flat
        shadows
        camera={ {
            fov: 45,
            near: 0.1,
            far: 200,
            position: [ 5, 5, 5 ]
        } }
    >
        <Experience2 />
    </Canvas>
)