import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import { Colors } from '../lib/colors';
import { useTranslation } from 'react-i18next';
import { createNeumorphicCard, NeumorphicTextStyles } from '../lib/neumorphicStyles';

interface OnboardingScreenProps {
  onComplete: () => void;
}

const { width } = Dimensions.get('window');

// We'll build the onboarding data using translation keys inside the component

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const onboardingData = [
    { id: 1, title: t('onboarding.slide1Title'), description: t('onboarding.slide1Desc'), gradientColors: [Colors.aquaTechBlue, Colors.deepSecurityBlue], image: require('../assets/icons/HydroSnap_logo_untexted.png') },
    { id: 2, title: t('onboarding.slide2Title'), description: t('onboarding.slide2Desc'), icon: '📍', gradientColors: [Colors.validationGreen, Colors.aquaTechBlue], image: require('../assets/icons/HydroSnap_logo_untexted.png') },
    { id: 3, title: t('onboarding.slide3Title'), description: t('onboarding.slide3Desc'), icon: '📱', gradientColors: [Colors.deepSecurityBlue, Colors.pinkAccent], image: require('../assets/icons/HydroSnap_logo_untexted.png') },
    { id: 4, title: t('onboarding.slide4Title'), description: t('onboarding.slide4Desc'), icon: '🤖', gradientColors: [Colors.pinkAccent, Colors.aquaTechBlue], image: require('../assets/icons/HydroSnap_logo_untexted.png') },
    { id: 5, title: t('onboarding.slide5Title'), description: t('onboarding.slide5Desc'), icon: '📸', gradientColors: [Colors.warning, Colors.validationGreen], image: require('../assets/icons/HydroSnap_logo_untexted.png') },
    { id: 6, title: t('onboarding.slide6Title'), description: t('onboarding.slide6Desc'), icon: '📡', gradientColors: [Colors.info, Colors.deepSecurityBlue], image: require('../assets/icons/HydroSnap_logo_untexted.png') },
    { id: 7, title: t('onboarding.slide7Title'), description: t('onboarding.slide7Desc'), icon: '📊', gradientColors: [Colors.validationGreen, Colors.pinkAccent], image: require('../assets/icons/HydroSnap_logo_untexted.png') },
    { id: 8, title: t('onboarding.slide8Title'), description: t('onboarding.slide8Desc'), gradientColors: [Colors.aquaTechBlue, Colors.deepSecurityBlue], image: require('../assets/icons/HydroSnap_logo.png') },
  ];
  const scrollViewRef = useRef<ScrollView>(null);

  const getFeatureHighlight = (id: number): string => {
    const highlights: { [key: number]: string } = {
      2: t('onboarding.slide2Highlight'),
      3: t('onboarding.slide3Highlight'), 
      4: t('onboarding.slide4Highlight'),
      5: t('onboarding.slide5Highlight'),
      6: t('onboarding.slide6Highlight'),
      7: t('onboarding.slide7Highlight')
    };
    return highlights[id] || "";
  };

  const handleNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      scrollViewRef.current?.scrollTo({
        x: nextIndex * width,
        animated: true,
      });
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      scrollViewRef.current?.scrollTo({
        x: prevIndex * width,
        animated: true,
      });
    }
  };

  const renderSlide = (item: typeof onboardingData[0]) => (
    <View key={item.id} style={styles.slide}>
      {/* Icon Container with Dynamic Gradient */}
      <View style={[
        styles.iconContainer, 
        createNeumorphicCard({ size: 'large' }),
        { 
          backgroundColor: Colors.white,
          borderWidth: 2,
          borderColor: item.gradientColors[0] + '20'
        }
      ]}>        
        {/* Icon */}
        <Text style={[styles.icon, { color: item.gradientColors[1] }]}>{item.icon}</Text>
        
        {/* Logo for specific slides */}
        {(item.id === 1 || item.id === 8) && (
          <Image source={item.image} style={styles.slideImage} resizeMode="contain" />
        )}
      </View>
      
      {/* Content Container */}
      <View style={styles.contentContainer}>
        <Text style={[styles.title, NeumorphicTextStyles.heading, { 
          color: item.id === 1 || item.id === 8 ? item.gradientColors[1] : Colors.darkText 
        }]}>
          {item.title}
        </Text>
        
        <Text style={[styles.description, NeumorphicTextStyles.body]}>
          {item.description}
        </Text>
        
        {/* Feature highlights for specific slides */}
        {item.id > 1 && item.id < 8 && (
          <View style={styles.featureHighlight}>
            <View style={[styles.highlightDot, { backgroundColor: item.gradientColors[0] }]} />
            <Text style={[styles.highlightText, { color: item.gradientColors[1] }]}>
              {getFeatureHighlight(item.id)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderPagination = () => (
    <View style={styles.paginationContainer}>
      {onboardingData.map((_, index) => (
        <View
          key={index}
          style={[
            styles.paginationDot,
            index === currentIndex ? styles.activeDot : styles.inactiveDot,
          ]}
        />
      ))}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: onboardingData[currentIndex]?.gradientColors[0] + '08' || Colors.softLightGrey }]}>
      {/* Header */}
      <View style={styles.header}>
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${((currentIndex + 1) / onboardingData.length) * 100}%`,
                  backgroundColor: onboardingData[currentIndex]?.gradientColors[1] || Colors.deepSecurityBlue
                }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {t('onboarding.progressOf', { current: currentIndex + 1, total: onboardingData.length })}
          </Text>
        </View>
        
        {/* Skip Button */}
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
          setCurrentIndex(newIndex);
        }}
        style={styles.scrollView}
      >
        {onboardingData.map((item) => renderSlide(item))}
      </ScrollView>

      {/* Pagination */}
      {renderPagination()}

      {/* Footer */}
      <View style={styles.footer}>
        {currentIndex > 0 && (
          <TouchableOpacity
            onPress={handlePrevious}
            style={[styles.navButton, styles.previousButton, createNeumorphicCard({ size: 'medium' })]}
          >
            <Text style={styles.previousButtonText}>{t('onboarding.previous')}</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          onPress={handleNext}
          style={[
            styles.navButton,
            styles.nextButton,
            currentIndex === 0 && styles.singleButton,
          ]}
        >
          <Text style={styles.nextButtonText}>
            {currentIndex === onboardingData.length - 1 ? t('onboarding.getStarted') : t('onboarding.next')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.softLightGrey,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressContainer: {
    flex: 1,
    marginRight: 15,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.white + '60',
  },
  skipText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width,
    paddingHorizontal: 30,
    paddingVertical: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  iconContainer: {
    width: 180,
    height: 180,
    borderRadius: 90,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    position: 'relative',
    shadowColor: Colors.deepSecurityBlue,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  icon: {
    fontSize: 50,
    marginBottom: 10,
    fontWeight: '600',
  },
  slideImage: {
    width: 130,
    height: 130,
    position: 'absolute',
    bottom: 20,
  },
  contentContainer: {
    alignItems: 'center',
    maxWidth: 340,
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.deepSecurityBlue,
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 25,
    letterSpacing: 0.2,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 25,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
    backgroundColor: Colors.border,
  },
  activeDot: {
    backgroundColor: Colors.deepSecurityBlue,
    width: 24,
    height: 8,
    borderRadius: 4,
    transform: [{ scaleX: 1.2 }],
  },
  inactiveDot: {
    backgroundColor: Colors.border,
    opacity: 0.5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    paddingBottom: 55,
    alignItems: 'center',
  },
  navButton: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
    minWidth: 110,
    alignItems: 'center',
    shadowColor: Colors.deepSecurityBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  previousButton: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.deepSecurityBlue + '30',
  },
  nextButton: {
    backgroundColor: Colors.deepSecurityBlue,
    shadowColor: Colors.deepSecurityBlue,
    shadowOffset: { width: 10, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  singleButton: {
    marginLeft: 'auto',
  },
  previousButtonText: {
    fontSize: 15,
    color: Colors.deepSecurityBlue,
    fontWeight: '600',
  },
  nextButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },
  featureHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.white + '80',
    borderRadius: 20,
    alignSelf: 'center',
  },
  highlightDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  highlightText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default OnboardingScreen;