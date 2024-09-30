import Layout from "../components/Layout/Layout";
import SeoHead from "../components/SeoHead";
import Rastreo from "../components/BuscaVehiculo/Rastreo";

export default function Home() {
  return (
    < >
     <SeoHead title='Rastreo de BIN - Jorge Minnesota Logistic LLC' />
      <Layout className="bg-white-500">
          <div  >
              <Rastreo/>
          </div>
      </Layout>
    </>
  );
}
