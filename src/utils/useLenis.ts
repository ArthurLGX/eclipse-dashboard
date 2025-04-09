import { useEffect } from 'react';
import Lenis from 'lenis';

const useLenis = () => {
    useEffect(() => {
        // Initialiser Lenis
        const lenis = new Lenis({
            duration: 1,  // Vitesse du défilement
            smoothWheel: true});

        // Démarrer l'animation
        function raf(time: number) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }

        requestAnimationFrame(raf);

        // Cleanup : Détruire l'instance de Lenis lorsque le composant est démonté
        return () => {
            lenis.destroy();
        };
    }, []);  // Le tableau vide [] signifie que ce code s'exécute une seule fois après le montage du composant

};

export default useLenis;
