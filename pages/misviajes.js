import { useEffect } from "react";
import { useRouter } from "next/router";

const MisViajes = () => {
    const router = useRouter();
    useEffect(() => {
        router.replace("/driver");
    }, []);
    return null;
};

export default MisViajes;
