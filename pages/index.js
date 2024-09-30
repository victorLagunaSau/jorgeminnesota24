import Feature from "../components/Feature";
import Pricing from "../components/Pricing";
import Hero from "../components/Hero";
import Layout from "../components/Layout/Layout";
import SeoHead from "../components/SeoHead";
import Catalogo from "../components/Catalogo/Catalogo";

export default function Home() {
  return (
    <>
      <SeoHead title='Jorge Minnesota Logistic LLC' />
      <Layout>
        <Hero />
        <Catalogo/>
        {/*<Feature />*/}
        {/*<Pricing />*/}
      </Layout>
        .
    </>
  );
}
