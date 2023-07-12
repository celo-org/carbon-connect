import type { AppProps } from "next/app";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { configureChains, createConfig, WagmiConfig } from "wagmi";
import celoGroups from "@celo/rainbowkit-celo/lists";
import Layout from "../components/Layout";
import "../styles/globals.css";
import "@rainbow-me/rainbowkit/styles.css";
import { publicProvider } from "wagmi/providers/public";
import { Alfajores, Celo } from "@celo/rainbowkit-celo/chains";
import { SessionProvider } from "next-auth/react";

const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID as string; // get one at https://cloud.walletconnect.com/app

const appInfo = {
    appName: "Carbon Connect", // TODO is this the right place to define?
};

const { chains, publicClient } = configureChains(
    [Celo, Alfajores],
    [publicProvider()] // TODO why is this different from example dapps?
);

const connectors = celoGroups({
    chains,
    projectId,
    appName:
        (typeof document === "object" && document.title) || appInfo.appName, // TODO what is this 'document' stuff? 
});

const wagmiConfig = createConfig({
    autoConnect: true,
    connectors,
    publicClient,
});

function App({ Component, pageProps }: AppProps) {
    return (
        <WagmiConfig config={wagmiConfig}>
            <RainbowKitProvider
                chains={chains}
                appInfo={appInfo} // TODO why is this different from example dapps
                coolMode={true}
            >
                <SessionProvider session={pageProps.session}>
                    <Layout>
                        <Component {...pageProps} />
                    </Layout>
                </SessionProvider> 
            </RainbowKitProvider>
        </WagmiConfig>
    );
}

export default App;
