import PlaceholderPage from "@/pages/PlaceholderPage";
export default function ChannelAnalyticsPage({ channelName }: { channelName: string }) {
  return <PlaceholderPage title={`${channelName} Analytics`} description={`View analytics for ${channelName} sales channel.`} />;
}
