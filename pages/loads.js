import { useEffect } from "react";
import { useRouter } from "next/router";

const LoadsPage = () => {
    const router = useRouter();
    useEffect(() => {
        router.replace("/carriers");
    }, []);
    return null;
};

export default LoadsPage;
